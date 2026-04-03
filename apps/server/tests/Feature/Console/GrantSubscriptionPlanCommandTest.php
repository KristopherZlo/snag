<?php

namespace Tests\Feature\Console;

use App\Enums\BillingPlan;
use App\Models\SubscriptionState;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class GrantSubscriptionPlanCommandTest extends TestCase
{
    use CreatesOrganizations;
    use RefreshDatabase;

    public function test_it_grants_the_requested_plan_to_the_users_active_organization(): void
    {
        $user = User::factory()->create([
            'email' => 'test@mail.com',
        ]);

        $organization = $this->createOrganizationFor($user, BillingPlan::Free, 'Studio Org');

        $this->artisan('snag:grant-plan', [
            'email' => 'test@mail.com',
            'plan' => 'studio',
        ])->assertSuccessful();

        $subscription = SubscriptionState::query()
            ->where('organization_id', $organization->getKey())
            ->first();

        $this->assertNotNull($subscription);
        $this->assertSame(BillingPlan::Studio, $subscription->plan);
        $this->assertSame('active', $subscription->status);
        $this->assertSame(config('snag.billing.plans.studio'), $subscription->entitlements);
    }

    public function test_it_can_create_a_missing_user_and_organization_before_granting_the_plan(): void
    {
        $this->artisan('snag:grant-plan', [
            'email' => 'test@mail.com',
            'plan' => 'studio',
            '--create-missing' => true,
        ])->assertSuccessful();

        $user = User::query()->where('email', 'test@mail.com')->first();

        $this->assertNotNull($user);
        $this->assertNotNull($user->email_verified_at);
        $this->assertSame('Test', $user->name);
        $this->assertNotNull($user->active_organization_id);
        $this->assertFalse(Hash::check('password', $user->password));

        $subscription = SubscriptionState::query()
            ->where('organization_id', $user->active_organization_id)
            ->first();

        $this->assertNotNull($subscription);
        $this->assertSame(BillingPlan::Studio, $subscription->plan);
        $this->assertSame(config('snag.billing.plans.studio'), $subscription->entitlements);
    }
}
