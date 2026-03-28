<?php

namespace App\Policies;

use App\Models\Organization;
use App\Models\User;

class OrganizationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->memberships()->exists();
    }

    public function view(User $user, Organization $organization): bool
    {
        return $user->memberships()->where('organization_id', $organization->id)->exists();
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Organization $organization): bool
    {
        return $user->ownedOrganizations()->whereKey($organization->id)->exists()
            || $user->memberships()->where('organization_id', $organization->id)->whereIn('role', ['owner', 'admin'])->exists();
    }

    public function delete(User $user, Organization $organization): bool
    {
        return $user->ownedOrganizations()->whereKey($organization->id)->exists();
    }
}
