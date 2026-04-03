<?php

namespace Tests\Feature\Billing;

use App\Enums\BillingPlan;
use App\Models\Organization;
use App\Models\SubscriptionState;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class StripeWebhookSecurityTest extends TestCase
{
    use CreatesOrganizations;
    use RefreshDatabase;

    public function test_stripe_webhook_rejects_requests_when_the_signing_secret_is_not_configured(): void
    {
        config([
            'snag.billing.stripe.webhook_secret' => null,
            'snag.billing.stripe.prices.pro' => 'price_pro_123',
        ]);

        $organization = $this->createOrganizationFor(User::factory()->create());
        $organization->forceFill(['stripe_id' => 'cus_missing_secret'])->save();

        $payload = $this->subscriptionPayload('evt_missing_secret', 'cus_missing_secret', 'price_pro_123');
        $content = json_encode($payload, JSON_THROW_ON_ERROR);

        $response = $this->call(
            'POST',
            route('api.v1.webhooks.stripe'),
            [],
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            $content,
        );

        $response->assertStatus(503);
        $this->assertDatabaseCount('billing_events', 0);
        $subscription = SubscriptionState::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($subscription);
        $this->assertSame(BillingPlan::Free, $subscription->plan);
        $this->assertNull($subscription->provider);
    }

    public function test_stripe_webhook_rejects_invalid_signatures_without_mutating_subscription_state(): void
    {
        config([
            'snag.billing.stripe.webhook_secret' => 'whsec_valid_secret',
            'snag.billing.stripe.prices.pro' => 'price_pro_123',
        ]);

        $organization = $this->createOrganizationFor(User::factory()->create());
        $organization->forceFill(['stripe_id' => 'cus_invalid_signature'])->save();

        $payload = $this->subscriptionPayload('evt_invalid_signature', 'cus_invalid_signature', 'price_pro_123');
        $content = json_encode($payload, JSON_THROW_ON_ERROR);

        $response = $this->call(
            'POST',
            route('api.v1.webhooks.stripe'),
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_STRIPE_SIGNATURE' => $this->stripeSignatureHeader($content, 'whsec_wrong_secret'),
            ],
            $content,
        );

        $response->assertUnauthorized();
        $this->assertDatabaseCount('billing_events', 0);
        $subscription = SubscriptionState::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($subscription);
        $this->assertSame(BillingPlan::Free, $subscription->plan);
        $this->assertNull($subscription->provider);
    }

    public function test_stripe_webhook_accepts_valid_signed_payloads(): void
    {
        config([
            'snag.billing.stripe.webhook_secret' => 'whsec_valid_secret',
            'snag.billing.stripe.prices.pro' => 'price_pro_123',
        ]);

        $organization = $this->createOrganizationFor(User::factory()->create());
        $organization->forceFill(['stripe_id' => 'cus_valid_signature'])->save();

        $payload = $this->subscriptionPayload('evt_valid_signature', 'cus_valid_signature', 'price_pro_123');
        $content = json_encode($payload, JSON_THROW_ON_ERROR);

        $response = $this->call(
            'POST',
            route('api.v1.webhooks.stripe'),
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_STRIPE_SIGNATURE' => $this->stripeSignatureHeader($content, 'whsec_valid_secret'),
            ],
            $content,
        );

        $response->assertOk()
            ->assertJsonPath('status', 'processed');

        $subscription = SubscriptionState::query()->where('organization_id', $organization->id)->first();

        $this->assertNotNull($subscription);
        $this->assertSame(BillingPlan::Pro, $subscription->plan);
        $this->assertSame('customer.subscription.updated', $subscription->status);
    }

    /**
     * @return array<string, mixed>
     */
    private function subscriptionPayload(string $eventId, string $customerId, string $priceId): array
    {
        return [
            'id' => $eventId,
            'type' => 'customer.subscription.updated',
            'data' => [
                'object' => [
                    'id' => 'sub_test_123',
                    'customer' => $customerId,
                    'items' => [
                        'data' => [
                            [
                                'price' => [
                                    'id' => $priceId,
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    private function stripeSignatureHeader(string $payload, string $secret): string
    {
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp.'.'.$payload, $secret);

        return "t={$timestamp},v1={$signature}";
    }
}
