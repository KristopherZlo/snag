<?php

namespace Tests\Feature\Invitations;

use App\Models\Invitation;
use App\Models\User;
use App\Notifications\InvitationNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class InvitationFlowTest extends TestCase
{
    use CreatesOrganizations;
    use RefreshDatabase;

    public function test_owner_can_invite_and_member_can_accept(): void
    {
        Notification::fake();

        $owner = User::factory()->create(['email' => 'owner@example.com']);
        $member = User::factory()->create(['email' => 'member@example.com']);
        $organization = $this->createOrganizationFor($owner);

        $response = $this->actingAs($owner)->postJson(route('invitations.store'), [
            'email' => $member->email,
            'role' => 'member',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.email', $member->email)
            ->assertJsonPath('data.role', 'member')
            ->assertJsonPath('data.review_url', fn (string $value) => str_contains($value, '/invitations/'));

        $invitation = Invitation::query()->firstOrFail();
        $reviewUrl = $response->json('data.review_url');
        $rawToken = (string) str($reviewUrl)->afterLast('/');

        Notification::assertSentOnDemand(InvitationNotification::class, function ($notification, $channels, $notifiable) use ($member): bool {
            return ($notifiable->routes['mail'] ?? null) === $member->email;
        });

        $this->actingAs($member)
            ->post(route('invitations.accept', $rawToken))
            ->assertRedirect(route('dashboard'));

        $this->assertDatabaseHas('memberships', [
            'organization_id' => $organization->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);
        $this->assertSame(Invitation::hashToken($rawToken), $invitation->token);

        $this->assertSame($organization->id, $member->fresh()->active_organization_id);
    }

    public function test_member_can_reject_invitation(): void
    {
        $owner = User::factory()->create(['email' => 'owner@example.com']);
        $member = User::factory()->create(['email' => 'member@example.com']);
        $organization = $this->createOrganizationFor($owner);
        $rawToken = 'reject-token-1234567890123456789012345678';

        $invitation = Invitation::query()->create([
            'organization_id' => $organization->id,
            'email' => $member->email,
            'role' => 'member',
            'token' => $rawToken,
            'invited_by_user_id' => $owner->id,
            'expires_at' => now()->addDay(),
        ]);

        $this->actingAs($member)
            ->post(route('invitations.reject', $rawToken))
            ->assertRedirect(route('dashboard'));

        $this->assertDatabaseMissing('invitations', [
            'id' => $invitation->id,
        ]);
    }

    public function test_invitation_page_uses_action_urls_without_exposing_the_stored_token(): void
    {
        $owner = User::factory()->create(['email' => 'owner@example.com']);
        $member = User::factory()->create(['email' => 'member@example.com']);
        $organization = $this->createOrganizationFor($owner);
        $rawToken = 'show-token-12345678901234567890123456789012';

        Invitation::query()->create([
            'organization_id' => $organization->id,
            'email' => $member->email,
            'role' => 'member',
            'token' => $rawToken,
            'invited_by_user_id' => $owner->id,
            'expires_at' => now()->addDay(),
        ]);

        $this->actingAs($member)
            ->get(route('invitations.show', $rawToken))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Invitations/Show')
                ->where('invitation.token', $rawToken)
                ->where('invitation.accept_url', route('invitations.accept', $rawToken))
                ->where('invitation.reject_url', route('invitations.reject', $rawToken)));
    }
}
