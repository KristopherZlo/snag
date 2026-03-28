<?php

namespace App\Services\Billing;

use App\Enums\BillingPlan;
use App\Models\BillingEvent;
use App\Models\Organization;
use App\Models\SubscriptionState;
use Illuminate\Http\Request;
use Stripe\Webhook;

class StripeWebhookService
{
    public function __construct(private readonly EntitlementService $entitlements) {}

    public function handle(Request $request): BillingEvent
    {
        $secret = config('snag.billing.stripe.webhook_secret');
        $payload = $request->getContent();
        $signature = (string) $request->header('Stripe-Signature');

        $event = $secret
            ? Webhook::constructEvent($payload, $signature, $secret)
            : json_decode($payload, false, flags: JSON_THROW_ON_ERROR);

        $organization = $this->resolveOrganization($event);

        $billingEvent = BillingEvent::query()->firstOrCreate(
            ['provider_event_id' => $event->id],
            [
                'organization_id' => $organization?->id,
                'provider' => 'stripe',
                'event_type' => $event->type,
                'status' => 'processing',
                'payload' => json_decode($payload, true, flags: JSON_THROW_ON_ERROR),
            ]
        );

        if (! $billingEvent->processed_at && $organization) {
            SubscriptionState::query()->updateOrCreate(
                ['organization_id' => $organization->id],
                [
                    'plan' => $this->planFromEvent($event),
                    'provider' => 'stripe',
                    'provider_customer_id' => $event->data->object->customer ?? $organization->stripe_id,
                    'provider_subscription_id' => $event->data->object->subscription ?? $event->data->object->id ?? null,
                    'status' => $event->type,
                    'entitlements' => $this->entitlements->snapshot($organization),
                    'last_projected_at' => now(),
                ]
            );

            $billingEvent->forceFill([
                'status' => 'processed',
                'processed_at' => now(),
            ])->save();
        }

        return $billingEvent;
    }

    private function resolveOrganization(object $event): ?Organization
    {
        $customerId = $event->data->object->customer ?? null;

        return $customerId
            ? Organization::query()->where('stripe_id', $customerId)->first()
            : null;
    }

    private function planFromEvent(object $event): BillingPlan
    {
        $priceId = $event->data->object->items->data[0]->price->id
            ?? $event->data->object->metadata->price_id
            ?? null;

        return match ($priceId) {
            config('snag.billing.stripe.prices.studio') => BillingPlan::Studio,
            config('snag.billing.stripe.prices.pro') => BillingPlan::Pro,
            default => BillingPlan::Free,
        };
    }
}
