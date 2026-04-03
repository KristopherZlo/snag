<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WebsiteWidget;

class WebsiteWidgetPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->active_organization_id !== null
            && $user->memberships()
                ->where('organization_id', $user->active_organization_id)
                ->whereIn('role', ['owner', 'admin'])
                ->exists();
    }

    public function view(User $user, WebsiteWidget $websiteWidget): bool
    {
        return $user->memberships()
            ->where('organization_id', $websiteWidget->organization_id)
            ->exists();
    }

    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function update(User $user, WebsiteWidget $websiteWidget): bool
    {
        return $user->memberships()
            ->where('organization_id', $websiteWidget->organization_id)
            ->whereIn('role', ['owner', 'admin'])
            ->exists();
    }

    public function delete(User $user, WebsiteWidget $websiteWidget): bool
    {
        return $this->update($user, $websiteWidget);
    }
}
