<?php

namespace Tests\Feature\Invitations;

use App\Models\Invitation;
use App\Models\User;
use App\Notifications\InvitationNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
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
            ->assertJsonPath('data.role', 'member');

        $invitation = Invitation::query()->firstOrFail();

        Notification::assertSentOnDemand(InvitationNotification::class, function ($notification, $channels, $notifiable) use ($member): bool {
            return ($notifiable->routes['mail'] ?? null) === $member->email;
        });

        $this->actingAs($member)
            ->post(route('invitations.accept', $invitation->token))
            ->assertRedirect(route('dashboard'));

        $this->assertDatabaseHas('memberships', [
            'organization_id' => $organization->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);

        $this->assertSame($organization->id, $member->fresh()->active_organization_id);
    }

    public function test_member_can_reject_invitation(): void
    {
        $owner = User::factory()->create(['email' => 'owner@example.com']);
        $member = User::factory()->create(['email' => 'member@example.com']);
        $organization = $this->createOrganizationFor($owner);

        $invitation = Invitation::query()->create([
            'organization_id' => $organization->id,
            'email' => $member->email,
            'role' => 'member',
            'token' => 'reject-token-1234567890123456789012345678',
            'invited_by_user_id' => $owner->id,
            'expires_at' => now()->addDay(),
        ]);

        $this->actingAs($member)
            ->post(route('invitations.reject', $invitation->token))
            ->assertRedirect(route('dashboard'));

        $this->assertDatabaseMissing('invitations', [
            'id' => $invitation->id,
        ]);
    }
}
