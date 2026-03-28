<?php

namespace Tests\Concerns;

use App\Enums\BillingPlan;
use App\Enums\OrganizationRole;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\SubscriptionState;
use App\Models\User;
use Illuminate\Support\Str;

trait CreatesOrganizations
{
    protected function addMembership(
        Organization $organization,
        User $user,
        OrganizationRole $role = OrganizationRole::Member,
        ?User $invitedBy = null,
    ): Membership {
        return Membership::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'role' => $role->value,
            'invited_by_user_id' => $invitedBy?->id,
            'joined_at' => now(),
        ]);
    }

    protected function createOrganizationFor(
        User $owner,
        BillingPlan $plan = BillingPlan::Free,
        string $name = 'Acme QA'
    ): Organization {
        $organization = Organization::query()->create([
            'owner_id' => $owner->id,
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
            'billing_email' => $owner->email,
        ]);

        $this->addMembership($organization, $owner, OrganizationRole::Owner, $owner);

        SubscriptionState::query()->create([
            'organization_id' => $organization->id,
            'plan' => $plan->value,
            'status' => $plan === BillingPlan::Free ? 'free' : 'active',
            'entitlements' => config("snag.billing.plans.{$plan->value}"),
            'last_projected_at' => now(),
        ]);

        $owner->forceFill([
            'active_organization_id' => $organization->id,
        ])->save();

        return $organization->fresh();
    }
}
