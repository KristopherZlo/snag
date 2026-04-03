<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\CaptureKey;
use App\Models\Organization;
use App\Models\OrganizationIntegration;
use App\Services\Billing\EntitlementService;
use App\Services\Integrations\OrganizationIntegrationPresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(Request $request, EntitlementService $entitlements): Response
    {
        return $this->renderSection($request, $entitlements, 'profile');
    }

    public function members(Request $request, EntitlementService $entitlements): Response
    {
        return $this->renderSection($request, $entitlements, 'members');
    }

    public function billing(Request $request, EntitlementService $entitlements): Response
    {
        abort_unless($this->canManageOrganization($request), 403);

        return $this->renderSection($request, $entitlements, 'billing');
    }

    public function captureKeys(Request $request, EntitlementService $entitlements): Response
    {
        $this->authorize('viewAny', CaptureKey::class);

        return $this->renderSection($request, $entitlements, 'capture-keys');
    }

    public function integrations(Request $request, EntitlementService $entitlements): Response
    {
        $this->authorize('viewAny', OrganizationIntegration::class);

        return $this->renderSection($request, $entitlements, 'integrations');
    }

    private function renderSection(Request $request, EntitlementService $entitlements, string $section): Response
    {
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');
        $integrationPresenter = app(OrganizationIntegrationPresenter::class);
        $canManageCaptureKeys = $request->user()->can('viewAny', CaptureKey::class);
        $canManageBilling = $this->canManageOrganization($request);
        $canManageIntegrations = $request->user()->can('viewAny', OrganizationIntegration::class);

        return Inertia::render('Settings/Index', [
            'section' => $section,
            'canManageCaptureKeys' => $canManageCaptureKeys,
            'canManageBilling' => $canManageBilling,
            'canManageIntegrations' => $canManageIntegrations,
            'members' => $organization->memberships()->with('user')->get()->map(fn ($membership) => [
                'id' => $membership->id,
                'role' => $membership->role->value,
                'joined_at' => optional($membership->joined_at)->toIso8601String(),
                'user' => $membership->user?->only(['id', 'name', 'email']),
            ]),
            'invitations' => $organization->invitations()
                ->whereNull('accepted_at')
                ->where('expires_at', '>', now())
                ->latest()
                ->get()
                ->map(fn ($invitation) => [
                    'id' => $invitation->id,
                    'email' => $invitation->email,
                    'role' => $invitation->role->value,
                    'expires_at' => optional($invitation->expires_at)->toIso8601String(),
                ]),
            'captureKeys' => $canManageCaptureKeys
                ? $organization->captureKeys()->latest()->get()->map(fn ($key) => [
                    'id' => $key->id,
                    'name' => $key->name,
                    'public_key' => $key->public_key,
                    'status' => $key->status->value,
                    'allowed_origins' => $key->allowed_origins,
                ])
                : [],
            'billing' => [
                'enabled' => config('snag.billing.enabled'),
                'entitlements' => $entitlements->snapshot($organization),
                'subscription' => $organization->subscriptionState()->first(),
            ],
            'integrations' => $canManageIntegrations
                ? $organization->integrations()
                    ->get()
                    ->map(fn ($integration) => $integrationPresenter->present($integration))
                    ->values()
                : [],
        ]);
    }

    private function canManageOrganization(Request $request): bool
    {
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');

        return $organization->memberships()
            ->where('user_id', $request->user()->id)
            ->whereIn('role', ['owner', 'admin'])
            ->exists();
    }
}
