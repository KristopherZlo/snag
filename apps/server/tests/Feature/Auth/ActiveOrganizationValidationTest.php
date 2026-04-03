<?php

namespace Tests\Feature\Auth;

use App\Enums\OrganizationRole;
use App\Models\Membership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class ActiveOrganizationValidationTest extends TestCase
{
    use CreatesOrganizations;
    use RefreshDatabase;

    public function test_stale_active_organization_is_replaced_with_a_valid_membership_on_web_requests(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $staleOrganization = $this->createOrganizationFor($user, name: 'Stale Org');
        $fallbackOrganization = $this->createOrganizationFor(User::factory()->create(), name: 'Fallback Org');

        $this->addMembership($fallbackOrganization, $user, OrganizationRole::Member);

        Membership::query()
            ->where('organization_id', $staleOrganization->id)
            ->where('user_id', $user->id)
            ->delete();

        $user->forceFill([
            'active_organization_id' => $staleOrganization->id,
        ])->save();

        $this->actingAs($user)
            ->get(route('settings.index'))
            ->assertOk();

        $this->assertSame($fallbackOrganization->id, $user->fresh()->active_organization_id);
    }

    public function test_stale_active_organization_is_cleared_when_no_membership_remains_for_json_requests(): void
    {
        $user = User::factory()->create();
        $organization = $this->createOrganizationFor($user);

        Membership::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $user->id)
            ->delete();

        $user->forceFill([
            'active_organization_id' => $organization->id,
        ])->save();

        Sanctum::actingAs($user, ['reports:create']);

        $this->postJson(route('api.v1.reports.upload-session'), [
                'media_kind' => 'screenshot',
            ])
            ->assertStatus(409)
            ->assertSee('organization_required');

        $this->assertNull($user->fresh()->active_organization_id);
    }
}
