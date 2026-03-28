<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('organizations.{organizationId}', function (User $user, int $organizationId) {
    return $user->memberships()->where('organization_id', $organizationId)->exists();
});
