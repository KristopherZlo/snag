<?php

namespace App\Services\Import;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class XamppUserSubscriptionImporter
{
    public function import(string $sourceConnection, string $targetConnection): XamppUserSubscriptionImportResult
    {
        $source = DB::connection($sourceConnection);
        $target = DB::connection($targetConnection);

        $sourceUsers = $source->table('users')->orderBy('id')->get();
        $sourceOrganizations = $source->table('organizations')->orderBy('id')->get();
        $sourceMemberships = $source->table('memberships')->orderBy('id')->get();
        $sourceSubscriptionStates = $source->table('subscription_states')->orderBy('id')->get();
        $sourceSubscriptions = $source->table('subscriptions')->orderBy('id')->get();
        $sourceSubscriptionItems = $source->table('subscription_items')->orderBy('id')->get();

        $target->transaction(function () use (
            $target,
            $sourceUsers,
            $sourceOrganizations,
            $sourceMemberships,
            $sourceSubscriptionStates,
            $sourceSubscriptions,
            $sourceSubscriptionItems,
        ): void {
            $this->upsertUsers($target, $sourceUsers);

            $userIdMap = $this->userIdMap($target, $sourceUsers);

            $this->upsertOrganizations($target, $sourceOrganizations, $userIdMap);

            $organizationIdMap = $this->organizationIdMap($target, $sourceOrganizations);

            $this->upsertMemberships($target, $sourceMemberships, $userIdMap, $organizationIdMap);
            $this->syncActiveOrganizations($target, $sourceUsers, $organizationIdMap);
            $this->upsertSubscriptionStates($target, $sourceSubscriptionStates, $organizationIdMap);
            $this->upsertSubscriptions($target, $sourceSubscriptions, $organizationIdMap);

            $subscriptionIdMap = $this->subscriptionIdMap($target, $sourceSubscriptions);

            $this->upsertSubscriptionItems($target, $sourceSubscriptionItems, $subscriptionIdMap);
        });

        return new XamppUserSubscriptionImportResult([
            'users' => $sourceUsers->count(),
            'organizations' => $sourceOrganizations->count(),
            'memberships' => $sourceMemberships->count(),
            'subscription_states' => $sourceSubscriptionStates->count(),
            'subscriptions' => $sourceSubscriptions->count(),
            'subscription_items' => $sourceSubscriptionItems->count(),
        ]);
    }

    /**
     * @param  Collection<int, object>  $sourceUsers
     */
    private function upsertUsers($target, Collection $sourceUsers): void
    {
        if ($sourceUsers->isEmpty()) {
            return;
        }

        $rows = $sourceUsers->map(fn (object $user): array => [
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at,
            'active_organization_id' => null,
            'password' => $user->password,
            'remember_token' => $user->remember_token,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
        ])->all();

        $target->table('users')->upsert(
            $rows,
            ['email'],
            ['name', 'email_verified_at', 'password', 'remember_token', 'created_at', 'updated_at']
        );
    }

    /**
     * @param  Collection<int, object>  $sourceOrganizations
     * @param  array<int, int>  $userIdMap
     */
    private function upsertOrganizations($target, Collection $sourceOrganizations, array $userIdMap): void
    {
        if ($sourceOrganizations->isEmpty()) {
            return;
        }

        $rows = [];

        foreach ($sourceOrganizations as $organization) {
            $ownerId = $userIdMap[(int) $organization->owner_id] ?? null;

            if ($ownerId === null) {
                throw new RuntimeException("Unable to map organization owner for source organization [{$organization->slug}].");
            }

            $rows[] = [
                'owner_id' => $ownerId,
                'name' => $organization->name,
                'slug' => $organization->slug,
                'billing_email' => $organization->billing_email,
                'stripe_id' => $organization->stripe_id,
                'pm_type' => $organization->pm_type,
                'pm_last_four' => $organization->pm_last_four,
                'trial_ends_at' => $organization->trial_ends_at,
                'created_at' => $organization->created_at,
                'updated_at' => $organization->updated_at,
            ];
        }

        $target->table('organizations')->upsert(
            $rows,
            ['slug'],
            ['owner_id', 'name', 'billing_email', 'stripe_id', 'pm_type', 'pm_last_four', 'trial_ends_at', 'created_at', 'updated_at']
        );
    }

    /**
     * @param  Collection<int, object>  $sourceMemberships
     * @param  array<int, int>  $userIdMap
     * @param  array<int, int>  $organizationIdMap
     */
    private function upsertMemberships($target, Collection $sourceMemberships, array $userIdMap, array $organizationIdMap): void
    {
        if ($sourceMemberships->isEmpty()) {
            return;
        }

        $rows = [];

        foreach ($sourceMemberships as $membership) {
            $organizationId = $organizationIdMap[(int) $membership->organization_id] ?? null;
            $userId = $userIdMap[(int) $membership->user_id] ?? null;

            if ($organizationId === null || $userId === null) {
                throw new RuntimeException("Unable to map membership [{$membership->id}] to target identifiers.");
            }

            $rows[] = [
                'organization_id' => $organizationId,
                'user_id' => $userId,
                'role' => $membership->role,
                'invited_by_user_id' => $membership->invited_by_user_id !== null
                    ? ($userIdMap[(int) $membership->invited_by_user_id] ?? null)
                    : null,
                'joined_at' => $membership->joined_at,
                'created_at' => $membership->created_at,
                'updated_at' => $membership->updated_at,
            ];
        }

        $target->table('memberships')->upsert(
            $rows,
            ['organization_id', 'user_id'],
            ['role', 'invited_by_user_id', 'joined_at', 'created_at', 'updated_at']
        );
    }

    /**
     * @param  Collection<int, object>  $sourceUsers
     * @param  array<int, int>  $organizationIdMap
     */
    private function syncActiveOrganizations($target, Collection $sourceUsers, array $organizationIdMap): void
    {
        foreach ($sourceUsers as $user) {
            $activeOrganizationId = $user->active_organization_id !== null
                ? ($organizationIdMap[(int) $user->active_organization_id] ?? null)
                : null;

            $target->table('users')
                ->where('email', $user->email)
                ->update([
                    'active_organization_id' => $activeOrganizationId,
                ]);
        }
    }

    /**
     * @param  Collection<int, object>  $sourceSubscriptionStates
     * @param  array<int, int>  $organizationIdMap
     */
    private function upsertSubscriptionStates($target, Collection $sourceSubscriptionStates, array $organizationIdMap): void
    {
        if ($sourceSubscriptionStates->isEmpty()) {
            return;
        }

        $rows = [];

        foreach ($sourceSubscriptionStates as $state) {
            $organizationId = $organizationIdMap[(int) $state->organization_id] ?? null;

            if ($organizationId === null) {
                throw new RuntimeException("Unable to map subscription state [{$state->id}] to a target organization.");
            }

            $rows[] = [
                'organization_id' => $organizationId,
                'plan' => $state->plan,
                'provider' => $state->provider,
                'provider_customer_id' => $state->provider_customer_id,
                'provider_subscription_id' => $state->provider_subscription_id,
                'status' => $state->status,
                'entitlements' => $state->entitlements,
                'current_period_ends_at' => $state->current_period_ends_at,
                'cancel_at_period_end' => $state->cancel_at_period_end,
                'last_projected_at' => $state->last_projected_at,
                'created_at' => $state->created_at,
                'updated_at' => $state->updated_at,
            ];
        }

        $target->table('subscription_states')->upsert(
            $rows,
            ['organization_id'],
            [
                'plan',
                'provider',
                'provider_customer_id',
                'provider_subscription_id',
                'status',
                'entitlements',
                'current_period_ends_at',
                'cancel_at_period_end',
                'last_projected_at',
                'created_at',
                'updated_at',
            ]
        );
    }

    /**
     * @param  Collection<int, object>  $sourceSubscriptions
     * @param  array<int, int>  $organizationIdMap
     */
    private function upsertSubscriptions($target, Collection $sourceSubscriptions, array $organizationIdMap): void
    {
        if ($sourceSubscriptions->isEmpty()) {
            return;
        }

        $rows = [];

        foreach ($sourceSubscriptions as $subscription) {
            $organizationId = $organizationIdMap[(int) $subscription->organization_id] ?? null;

            if ($organizationId === null) {
                throw new RuntimeException("Unable to map subscription [{$subscription->stripe_id}] to a target organization.");
            }

            $rows[] = [
                'organization_id' => $organizationId,
                'type' => $subscription->type,
                'stripe_id' => $subscription->stripe_id,
                'stripe_status' => $subscription->stripe_status,
                'stripe_price' => $subscription->stripe_price,
                'quantity' => $subscription->quantity,
                'trial_ends_at' => $subscription->trial_ends_at,
                'ends_at' => $subscription->ends_at,
                'created_at' => $subscription->created_at,
                'updated_at' => $subscription->updated_at,
            ];
        }

        $target->table('subscriptions')->upsert(
            $rows,
            ['stripe_id'],
            ['organization_id', 'type', 'stripe_status', 'stripe_price', 'quantity', 'trial_ends_at', 'ends_at', 'created_at', 'updated_at']
        );
    }

    /**
     * @param  Collection<int, object>  $sourceSubscriptionItems
     * @param  array<int, int>  $subscriptionIdMap
     */
    private function upsertSubscriptionItems($target, Collection $sourceSubscriptionItems, array $subscriptionIdMap): void
    {
        if ($sourceSubscriptionItems->isEmpty()) {
            return;
        }

        $rows = [];

        foreach ($sourceSubscriptionItems as $item) {
            $subscriptionId = $subscriptionIdMap[(int) $item->subscription_id] ?? null;

            if ($subscriptionId === null) {
                throw new RuntimeException("Unable to map subscription item [{$item->stripe_id}] to a target subscription.");
            }

            $rows[] = [
                'subscription_id' => $subscriptionId,
                'stripe_id' => $item->stripe_id,
                'stripe_product' => $item->stripe_product,
                'stripe_price' => $item->stripe_price,
                'meter_id' => $item->meter_id,
                'quantity' => $item->quantity,
                'meter_event_name' => $item->meter_event_name,
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
            ];
        }

        $target->table('subscription_items')->upsert(
            $rows,
            ['stripe_id'],
            ['subscription_id', 'stripe_product', 'stripe_price', 'meter_id', 'quantity', 'meter_event_name', 'created_at', 'updated_at']
        );
    }

    /**
     * @param  Collection<int, object>  $sourceUsers
     * @return array<int, int>
     */
    private function userIdMap($target, Collection $sourceUsers): array
    {
        $emails = $sourceUsers->pluck('email')->all();

        if ($emails === []) {
            return [];
        }

        $targetUsers = $target->table('users')
            ->whereIn('email', $emails)
            ->pluck('id', 'email');

        $map = [];

        foreach ($sourceUsers as $user) {
            $targetId = $targetUsers[$user->email] ?? null;

            if ($targetId === null) {
                throw new RuntimeException("Unable to resolve imported user [{$user->email}] in the target connection.");
            }

            $map[(int) $user->id] = (int) $targetId;
        }

        return $map;
    }

    /**
     * @param  Collection<int, object>  $sourceOrganizations
     * @return array<int, int>
     */
    private function organizationIdMap($target, Collection $sourceOrganizations): array
    {
        $slugs = $sourceOrganizations->pluck('slug')->all();

        if ($slugs === []) {
            return [];
        }

        $targetOrganizations = $target->table('organizations')
            ->whereIn('slug', $slugs)
            ->pluck('id', 'slug');

        $map = [];

        foreach ($sourceOrganizations as $organization) {
            $targetId = $targetOrganizations[$organization->slug] ?? null;

            if ($targetId === null) {
                throw new RuntimeException("Unable to resolve imported organization [{$organization->slug}] in the target connection.");
            }

            $map[(int) $organization->id] = (int) $targetId;
        }

        return $map;
    }

    /**
     * @param  Collection<int, object>  $sourceSubscriptions
     * @return array<int, int>
     */
    private function subscriptionIdMap($target, Collection $sourceSubscriptions): array
    {
        $stripeIds = $sourceSubscriptions->pluck('stripe_id')->all();

        if ($stripeIds === []) {
            return [];
        }

        $targetSubscriptions = $target->table('subscriptions')
            ->whereIn('stripe_id', $stripeIds)
            ->pluck('id', 'stripe_id');

        $map = [];

        foreach ($sourceSubscriptions as $subscription) {
            $targetId = $targetSubscriptions[$subscription->stripe_id] ?? null;

            if ($targetId === null) {
                throw new RuntimeException("Unable to resolve imported subscription [{$subscription->stripe_id}] in the target connection.");
            }

            $map[(int) $subscription->id] = (int) $targetId;
        }

        return $map;
    }
}
