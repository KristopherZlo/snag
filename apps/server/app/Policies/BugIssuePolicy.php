<?php

namespace App\Policies;

use App\Models\BugIssue;
use App\Models\User;

class BugIssuePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->active_organization_id !== null;
    }

    public function view(User $user, BugIssue $bugIssue): bool
    {
        return $user->memberships()->where('organization_id', $bugIssue->organization_id)->exists();
    }

    public function create(User $user): bool
    {
        return $user->active_organization_id !== null;
    }

    public function update(User $user, BugIssue $bugIssue): bool
    {
        return $user->memberships()->where('organization_id', $bugIssue->organization_id)->exists();
    }

    public function manageSharing(User $user, BugIssue $bugIssue): bool
    {
        return $this->update($user, $bugIssue);
    }
}
