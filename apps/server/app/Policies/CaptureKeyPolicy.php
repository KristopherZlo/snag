<?php

namespace App\Policies;

use App\Models\CaptureKey;
use App\Models\User;

class CaptureKeyPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->active_organization_id !== null
            && $user->memberships()
                ->where('organization_id', $user->active_organization_id)
                ->whereIn('role', ['owner', 'admin'])
                ->exists();
    }

    public function view(User $user, CaptureKey $captureKey): bool
    {
        return $user->memberships()->where('organization_id', $captureKey->organization_id)->exists();
    }

    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function update(User $user, CaptureKey $captureKey): bool
    {
        return $user->memberships()->where('organization_id', $captureKey->organization_id)->whereIn('role', ['owner', 'admin'])->exists();
    }

    public function delete(User $user, CaptureKey $captureKey): bool
    {
        return $this->update($user, $captureKey);
    }
}
