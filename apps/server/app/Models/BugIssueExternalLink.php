<?php

namespace App\Models;

use App\Enums\BugIssueExternalProvider;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BugIssueExternalLink extends Model
{
    use HasFactory;

    protected $fillable = [
        'bug_issue_id',
        'organization_id',
        'created_by_user_id',
        'provider',
        'external_key',
        'external_id',
        'external_url',
        'is_primary',
        'sync_mode',
        'last_synced_at',
        'last_sync_error',
        'external_snapshot',
    ];

    protected function casts(): array
    {
        return [
            'provider' => BugIssueExternalProvider::class,
            'is_primary' => 'boolean',
            'last_synced_at' => 'datetime',
            'external_snapshot' => 'array',
        ];
    }

    public function issue(): BelongsTo
    {
        return $this->belongsTo(BugIssue::class, 'bug_issue_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
