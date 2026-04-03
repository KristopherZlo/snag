<?php

namespace Tests\Feature\Settings;

use App\Enums\OrganizationRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class BillingAndCaptureKeyAccessTest extends TestCase
{
    use CreatesOrganizations;
    use RefreshDatabase;

    public function test_member_cannot_open_billing_or_capture_key_settings_sections(): void
    {
        $owner = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $organization = $this->createOrganizationFor($owner);
        $member = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $this->addMembership($organization, $member, OrganizationRole::Member, $owner);
        $member->forceFill([
            'active_organization_id' => $organization->id,
        ])->save();

        $this->actingAs($member)
            ->get(route('settings.capture-keys'))
            ->assertForbidden();

        $this->actingAs($member)
            ->get(route('settings.billing'))
            ->assertForbidden();
    }

    public function test_member_cannot_start_billing_checkout_or_open_billing_portal(): void
    {
        config()->set('snag.billing.enabled', true);
        config()->set('snag.billing.stripe.secret_key', 'sk_test_123');
        config()->set('snag.billing.stripe.prices.pro', 'price_pro_123');

        $owner = User::factory()->create();
        $organization = $this->createOrganizationFor($owner);
        $member = User::factory()->create();

        $this->addMembership($organization, $member, OrganizationRole::Member, $owner);
        $member->forceFill([
            'active_organization_id' => $organization->id,
        ])->save();

        Sanctum::actingAs($member, ['billing:manage']);

        $this->postJson(route('api.v1.billing.checkout'), [
            'plan' => 'pro',
        ])->assertForbidden();

        $this->postJson(route('api.v1.billing.portal'))->assertForbidden();
    }
}
