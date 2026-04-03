<?php

namespace Tests\Feature\Keys;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class SessionCaptureKeyApiTest extends TestCase
{
    use CreatesOrganizations;
    use RefreshDatabase;

    public function test_owner_can_create_capture_keys_through_api_routes(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $organization = $this->createOrganizationFor($user);

        $this->actingAs($user)
            ->postJson(route('capture-keys.store'), [
                'name' => 'Widget Key',
                'allowed_origins' => ['https://widget.example.com'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.organization_id', $organization->id)
            ->assertJsonPath('data.name', 'Widget Key');
    }

    public function test_member_cannot_manage_capture_keys_through_api_routes(): void
    {
        $owner = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $organization = $this->createOrganizationFor($owner);
        $member = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $this->addMembership($organization, $member);
        $member->forceFill([
            'active_organization_id' => $organization->id,
        ])->save();

        Sanctum::actingAs($member, ['capture-keys:manage']);

        $this->postJson(route('capture-keys.store'), [
            'name' => 'Widget Key',
            'allowed_origins' => ['https://widget.example.com'],
        ])->assertForbidden();

        $this->getJson(route('capture-keys.index'))->assertForbidden();
    }
}
