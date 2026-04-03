<?php

namespace App\Support;

use App\Models\Organization;
use App\Models\User;

class CurrentOrganization
{
    public function resolve(User $user): ?Organization
    {
        if ($user->active_organization_id !== null) {
            $activeMembership = $user->memberships()
                ->with('organization')
                ->where('organization_id', $user->active_organization_id)
                ->first();

            if ($activeMembership?->organization) {
                return $activeMembership->organization;
            }

            $user->forceFill([
                'active_organization_id' => null,
            ])->save();
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
