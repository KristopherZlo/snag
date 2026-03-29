<?php

namespace App\Models;

use App\Enums\BugIssueResolution;
use App\Enums\BugIssueWorkflowState;
use App\Enums\BugUrgency;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BugIssue extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'creator_id',
        'assignee_id',
        'title',
        'summary',
        'workflow_state',
        'urgency',
        'resolution',
        'labels',
        'meta',
        'first_seen_at',
        'last_seen_at',
    ];

    protected function casts(): array
    {
        return [
            'workflow_state' => BugIssueWorkflowState::class,
            'urgency' => BugUrgency::class,
            'resolution' => BugIssueResolution::class,
            'labels' => 'array',
            'meta' => 'array',
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(BugIssueReport::class);
    }

    public function reports(): BelongsToMany
    {
        return $this->belongsToMany(BugReport::class, 'bug_issue_reports')
            ->using(BugIssueReport::class)
            ->withPivot(['id', 'attached_by_user_id', 'is_primary'])
            ->withTimestamps();
    }

    public function externalLinks(): HasMany
    {
        return $this->hasMany(BugIssueExternalLink::class);
    }

    public function shareTokens(): HasMany
    {
        return $this->hasMany(BugIssueShareToken::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(BugIssueActivity::class);
    }
}
