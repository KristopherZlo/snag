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
            ->assertJsonPath('data.name', 'Widget Key')
            ->assertJsonPath('data.one_time_secrets.relay_secret', fn (?string $value) => is_string($value) && strlen($value) === 48);
    }

    public function test_capture_key_api_returns_masked_secret_state_without_ciphertext(): void
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
            ->assertCreated();

        $response = $this->actingAs($user)->getJson(route('capture-keys.index'));

        $response->assertOk()
            ->assertJsonPath('data.0.has_relay_secret', true)
            ->assertJsonPath('data.0.relay_secret_masked', fn (?string $value) => is_string($value) && str_starts_with($value, '************'))
            ->assertJsonMissingPath('data.0.relay_secret_encrypted')
            ->assertJsonMissingPath('data.0.one_time_secrets');
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
