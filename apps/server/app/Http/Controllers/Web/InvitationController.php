<?php

namespace App\Http\Controllers\Web;

use App\Enums\OrganizationRole;
use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use App\Notifications\InvitationNotification;
use App\Services\Billing\EntitlementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class InvitationController extends Controller
{
    public function show(Request $request, string $token): Response
    {
        $invitation = Invitation::query()
            ->where('token', $token)
            ->with(['organization', 'invitedBy'])
            ->firstOrFail();

        $this->ensureInvitationEmailMatches($request->user(), $invitation);

        return Inertia::render('Invitations/Show', [
            'invitation' => [
                'token' => $invitation->token,
                'email' => $invitation->email,
                'role' => $invitation->role->value,
                'state' => $this->state($invitation),
                'expires_at' => optional($invitation->expires_at)->toIso8601String(),
                'organization' => [
                    'name' => $invitation->organization->name,
                    'slug' => $invitation->organization->slug,
                ],
                'invited_by' => $invitation->invitedBy?->only(['name', 'email']),
            ],
        ]);
    }

    public function store(
        Request $request,
        EntitlementService $entitlements
    ): JsonResponse|RedirectResponse {
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');

        $this->authorize('update', $organization);

        $data = $request->validate([
            'email' => ['required', 'email:rfc'],
            'role' => ['required', 'string', 'in:admin,member'],
        ]);

        $entitlements->assertCanInviteMember($organization);

        $email = Str::lower(trim($data['email']));

        if ($organization->memberships()->whereHas('user', fn ($query) => $query->where('email', $email))->exists()) {
            throw ValidationException::withMessages([
                'email' => 'This user is already a member of the organization.',
            ]);
        }

        $invitation = $organization->invitations()->updateOrCreate(
            [
                'email' => $email,
                'accepted_at' => null,
            ],
            [
                'role' => OrganizationRole::from($data['role']),
                'token' => Str::lower(Str::random(40)),
                'invited_by_user_id' => $request->user()->id,
                'expires_at' => now()->addDays((int) config('snag.auth.invitation_ttl_days')),
            ]
        );

        $invitation->load(['organization', 'invitedBy']);

        Notification::route('mail', $invitation->email)->notify(
            new InvitationNotification($invitation)
        );

        if ($request->expectsJson()) {
            return response()->json([
                'data' => [
                    'id' => $invitation->id,
                    'email' => $invitation->email,
                    'role' => $invitation->role->value,
                    'expires_at' => optional($invitation->expires_at)->toIso8601String(),
                ],
            ], 201);
        }

        return back()->with('status', 'Invitation sent.');
    }

    public function destroy(Request $request, Invitation $invitation): JsonResponse|RedirectResponse
    {
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');

        abort_unless($invitation->organization_id === $organization->id, 404);
        $this->authorize('update', $organization);

        $invitation->delete();

        if ($request->expectsJson()) {
            return response()->json(['deleted' => true]);
        }

        return back()->with('status', 'Invitation revoked.');
    }

    public function accept(Request $request, string $token): RedirectResponse
    {
        DB::transaction(function () use ($request, $token): void {
            $invitation = Invitation::query()
                ->where('token', $token)
                ->with('organization')
                ->lockForUpdate()
                ->firstOrFail();

            $this->ensureInvitationEmailMatches($request->user(), $invitation);
            $this->ensureInvitationCanBeRespondedTo($invitation);

            Membership::query()->firstOrCreate(
                [
                    'organization_id' => $invitation->organization_id,
                    'user_id' => $request->user()->id,
                ],
                [
                    'role' => $invitation->role,
                    'invited_by_user_id' => $invitation->invited_by_user_id,
                    'joined_at' => now(),
                ]
            );

            $request->user()->forceFill([
                'active_organization_id' => $invitation->organization_id,
            ])->save();

            $invitation->forceFill([
                'accepted_at' => now(),
            ])->save();
        });

        return redirect()->route('dashboard')->with('status', 'Invitation accepted.');
    }

    public function reject(Request $request, string $token): RedirectResponse
    {
        DB::transaction(function () use ($request, $token): void {
            $invitation = Invitation::query()
                ->where('token', $token)
                ->lockForUpdate()
                ->firstOrFail();

            $this->ensureInvitationEmailMatches($request->user(), $invitation);
            $this->ensureInvitationCanBeRespondedTo($invitation);

            $invitation->delete();
        });

        return redirect()->route('dashboard')->with('status', 'Invitation declined.');
    }

    private function ensureInvitationEmailMatches(User $user, Invitation $invitation): void
    {
        abort_unless(
            Str::lower($user->email) === Str::lower($invitation->email),
            403,
            'invitation_email_mismatch'
        );
    }

    private function ensureInvitationCanBeRespondedTo(Invitation $invitation): void
    {
        if ($invitation->accepted_at) {
            throw ValidationException::withMessages([
                'invitation' => 'Invitation has already been accepted.',
            ]);
        }

        if ($invitation->expires_at?->isPast()) {
            throw ValidationException::withMessages([
                'invitation' => 'Invitation has expired.',
            ]);
        }
    }

    private function state(Invitation $invitation): string
    {
        if ($invitation->accepted_at) {
            return 'accepted';
        }

        if ($invitation->expires_at?->isPast()) {
            return 'expired';
        }

        return 'pending';
    }
}
