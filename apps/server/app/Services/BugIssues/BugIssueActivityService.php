<?php

namespace App\Services\BugIssues;

use App\Models\BugIssue;
use App\Models\User;

class BugIssueActivityService
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public function record(BugIssue $issue, string $kind, string $description, ?User $user = null, array $meta = []): void
    {
        $issue->activities()->create([
            'user_id' => $user?->id,
            'kind' => $kind,
            'description' => $description,
            'meta' => $meta === [] ? null : $meta,
            'created_at' => now(),
        ]);
    }
}
