<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\SubscriptionState;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationController extends Controller
{
    public function create(Request $request): Response
    {
        if ($request->user()->memberships()->exists()) {
            return Inertia::render('Onboarding/CreateOrganization', [
                'existingMemberships' => $request->user()->organizations()->get(['id', 'name', 'slug']),
            ]);
        }

        return Inertia::render('Onboarding/CreateOrganization', [
            'existingMemberships' => [],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($request, $data) {
            $organization = Organization::query()->create([
                'owner_id' => $request->user()->id,
                'name' => $data['name'],
                'slug' => Str::slug($data['name']).'-'.Str::lower(Str::random(6)),
                'billing_email' => $request->user()->email,
            ]);

            Membership::query()->create([
                'organization_id' => $organization->id,
                'user_id' => $request->user()->id,
                'role' => 'owner',
                'joined_at' => now(),
            ]);

            SubscriptionState::query()->create([
                'organization_id' => $organization->id,
                'plan' => 'free',
                'status' => 'free',
                'entitlements' => config('snag.billing.plans.free'),
                'last_projected_at' => now(),
            ]);

            $request->user()->forceFill([
                'active_organization_id' => $organization->id,
            ])->save();
        });

        return redirect()->route('dashboard');
    }

    public function switch(Request $request)
    {
        $data = $request->validate([
            'organization_id' => ['required', 'integer', 'exists:organizations,id'],
        ]);

        abort_unless(
            $request->user()->memberships()->where('organization_id', $data['organization_id'])->exists(),
            403
        );

        $request->user()->forceFill([
            'active_organization_id' => $data['organization_id'],
        ])->save();

        return back();
    }

    public function update(Request $request): JsonResponse
    {
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');

        $this->authorize('update', $organization);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'billing_email' => ['nullable', 'email', 'max:255'],
        ]);

        $organization->forceFill([
            'name' => $data['name'],
            'billing_email' => $data['billing_email'] ?: null,
        ])->save();

        return response()->json([
            'workspace' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
                'billing_email' => $organization->billing_email,
            ],
        ]);
    }
}
