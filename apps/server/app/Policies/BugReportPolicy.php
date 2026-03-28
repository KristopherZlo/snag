<?php

namespace App\Policies;

use App\Models\BugReport;
use App\Models\User;

class BugReportPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->active_organization_id !== null;
    }

    public function view(User $user, BugReport $bugReport): bool
    {
        return $user->memberships()->where('organization_id', $bugReport->organization_id)->exists();
    }

    public function create(User $user): bool
    {
        return $user->active_organization_id !== null;
    }

    public function update(User $user, BugReport $bugReport): bool
    {
        return $user->memberships()->where('organization_id', $bugReport->organization_id)->exists();
    }

    public function delete(User $user, BugReport $bugReport): bool
    {
        return $user->memberships()->where('organization_id', $bugReport->organization_id)->whereIn('role', ['owner', 'admin'])->exists();
    }

    public function retryIngestion(User $user, BugReport $bugReport): bool
    {
        return $this->delete($user, $bugReport);
    }
}
