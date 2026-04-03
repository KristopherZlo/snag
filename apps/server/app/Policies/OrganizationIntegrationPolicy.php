<?php

namespace App\Policies;

use App\Models\OrganizationIntegration;
use App\Models\User;

class OrganizationIntegrationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->active_organization_id !== null
            && $user->memberships()
                ->where('organization_id', $user->active_organization_id)
                ->whereIn('role', ['owner', 'admin'])
                ->exists();
    }

    public function update(User $user, OrganizationIntegration $integration): bool
    {
        return $user->memberships()
            ->where('organization_id', $integration->organization_id)
            ->whereIn('role', ['owner', 'admin'])
            ->exists();
    }
}
