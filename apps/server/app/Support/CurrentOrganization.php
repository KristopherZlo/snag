<?php

namespace App\Support;

use App\Models\Organization;
use App\Models\User;

class CurrentOrganization
{
    public function resolve(User $user): ?Organization
    {
        if ($user->activeOrganization) {
            return $user->activeOrganization;
        }

        $membership = $user->memberships()->with('organization')->oldest('id')->first();

        if (! $membership?->organization) {
            return null;
        }

        $user->forceFill([
            'active_organization_id' => $membership->organization_id,
        ])->save();

        return $membership->organization;
    }
}
