<?php

namespace Tests\Feature\Keys;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class SessionCaptureKeyApiTest extends TestCase
{
    use CreatesOrganizations;
    use RefreshDatabase;

    public function test_session_authenticated_user_can_create_capture_keys_through_api_routes(): void
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
}
