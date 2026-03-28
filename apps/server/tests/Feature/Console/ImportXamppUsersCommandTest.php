<?php

namespace Tests\Feature\Console;

use App\Enums\BillingPlan;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\SubscriptionState;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ImportXamppUsersCommandTest extends TestCase
{
    use RefreshDatabase;

    private string $legacyDatabasePath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->legacyDatabasePath = tempnam(sys_get_temp_dir(), 'snag-legacy-');

        Config::set('database.connections.legacy_source', [
            'driver' => 'sqlite',
            'database' => $this->legacyDatabasePath,
            'prefix' => '',
            'foreign_key_constraints' => true,
        ]);

        DB::purge('legacy_source');

        Artisan::call('migrate', [
            '--database' => 'legacy_source',
            '--force' => true,
        ]);
    }

    protected function tearDown(): void
    {
        DB::disconnect('legacy_source');

        if (is_file($this->legacyDatabasePath)) {
            @unlink($this->legacyDatabasePath);
        }

        parent::tearDown();
    }

    public function test_it_imports_users_organizations_memberships_and_subscriptions_from_a_legacy_connection(): void
    {
        $now = now()->toDateTimeString();

        DB::connection('legacy_source')->table('users')->insert([
            'id' => 10,
            'name' => 'Legacy User',
            'email' => 'legacy@example.com',
            'email_verified_at' => $now,
            'active_organization_id' => null,
            'password' => '$2y$12$legacylegacylegacylegacylegacylegacylegacylegacyleg',
            'remember_token' => 'legacy-token',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::connection('legacy_source')->table('organizations')->insert([
            'id' => 20,
            'owner_id' => 10,
            'name' => 'Legacy Org',
            'slug' => 'legacy-org',
            'billing_email' => 'billing@example.com',
            'stripe_id' => 'cus_legacy',
            'pm_type' => 'card',
            'pm_last_four' => '4242',
            'trial_ends_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::connection('legacy_source')->table('memberships')->insert([
            'id' => 30,
            'organization_id' => 20,
            'user_id' => 10,
            'role' => 'owner',
            'invited_by_user_id' => 10,
            'joined_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::connection('legacy_source')->table('subscription_states')->insert([
            'id' => 40,
            'organization_id' => 20,
            'plan' => 'studio',
            'provider' => 'manual',
            'provider_customer_id' => 'cus_legacy',
            'provider_subscription_id' => 'sub_legacy',
            'status' => 'active',
            'entitlements' => json_encode(config('snag.billing.plans.studio'), JSON_THROW_ON_ERROR),
            'current_period_ends_at' => $now,
            'cancel_at_period_end' => 0,
            'last_projected_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::connection('legacy_source')->table('subscriptions')->insert([
            'id' => 50,
            'organization_id' => 20,
            'type' => 'default',
            'stripe_id' => 'sub_legacy',
            'stripe_status' => 'active',
            'stripe_price' => 'price_legacy',
            'quantity' => 1,
            'trial_ends_at' => $now,
            'ends_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::connection('legacy_source')->table('subscription_items')->insert([
            'id' => 60,
            'subscription_id' => 50,
            'stripe_id' => 'si_legacy',
            'stripe_product' => 'prod_legacy',
            'stripe_price' => 'price_legacy',
            'meter_id' => null,
            'quantity' => 1,
            'meter_event_name' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::connection('legacy_source')->table('users')
            ->where('id', 10)
            ->update([
                'active_organization_id' => 20,
            ]);

        $this->artisan('snag:import-xampp-users', [
            '--source-connection' => 'legacy_source',
            '--target-connection' => 'sqlite',
        ])->assertSuccessful();

        $this->artisan('snag:import-xampp-users', [
            '--source-connection' => 'legacy_source',
            '--target-connection' => 'sqlite',
        ])->assertSuccessful();

        $user = User::query()->where('email', 'legacy@example.com')->first();
        $organization = Organization::query()->where('slug', 'legacy-org')->first();
        $membership = Membership::query()->first();
        $subscriptionState = SubscriptionState::query()->where('organization_id', $organization?->getKey())->first();

        $this->assertNotNull($user);
        $this->assertNotNull($organization);
        $this->assertNotNull($membership);
        $this->assertNotNull($subscriptionState);
        $this->assertSame($organization->getKey(), $user->active_organization_id);
        $this->assertSame($user->getKey(), $organization->owner_id);
        $this->assertSame($organization->getKey(), $membership->organization_id);
        $this->assertSame($user->getKey(), $membership->user_id);
        $this->assertSame(BillingPlan::Studio, $subscriptionState->plan);
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('organizations', 1);
        $this->assertDatabaseCount('memberships', 1);
        $this->assertDatabaseCount('subscription_states', 1);
        $this->assertDatabaseCount('subscriptions', 1);
        $this->assertDatabaseCount('subscription_items', 1);
        $this->assertDatabaseHas('subscriptions', [
            'organization_id' => $organization->getKey(),
            'stripe_id' => 'sub_legacy',
        ]);
        $this->assertDatabaseHas('subscription_items', [
            'stripe_id' => 'si_legacy',
        ]);
    }
}
