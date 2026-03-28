<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OrganizationOnboardingTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_shared_props_include_the_active_organization_after_onboarding(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $this->actingAs($user)->post(route('organizations.store'), [
            'name' => 'Acme QA',
        ])->assertRedirect(route('dashboard'));

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('organization.name', 'Acme QA'));
    }
}
