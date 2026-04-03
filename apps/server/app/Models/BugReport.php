<?php

namespace App\Models;

use App\Enums\BugReportStatus;
use App\Enums\BugTriageTag;
use App\Enums\BugUrgency;
use App\Enums\BugWorkflowState;
use App\Enums\ReportVisibility;
use App\Support\HashedToken;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class BugReport extends Model
{
    use HasFactory, SoftDeletes;

    protected static function booted(): void
    {
        static::saving(function (self $report): void {
            if (HashedToken::needsHashing($report->share_token)) {
                $report->share_token = self::hashShareToken($report->share_token);
            }
        });
    }

    protected $fillable = [
        'organization_id',
        'upload_session_id',
        'capture_key_id',
        'reporter_id',
        'title',
        'summary',
        'media_kind',
        'status',
        'workflow_state',
        'urgency',
        'triage_tag',
        'visibility',
        'share_token',
        'meta',
        'ready_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => BugReportStatus::class,
            'workflow_state' => BugWorkflowState::class,
            'urgency' => BugUrgency::class,
            'triage_tag' => BugTriageTag::class,
            'visibility' => ReportVisibility::class,
            'meta' => 'array',
            'ready_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function uploadSession(): BelongsTo
    {
        return $this->belongsTo(UploadSession::class);
    }

    public function captureKey(): BelongsTo
    {
        return $this->belongsTo(CaptureKey::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function artifacts(): HasMany
    {
        return $this->hasMany(ReportArtifact::class);
    }

    public function issues(): BelongsToMany
    {
        return $this->belongsToMany(BugIssue::class, 'bug_issue_reports')
            ->using(BugIssueReport::class)
            ->withPivot(['id', 'attached_by_user_id', 'is_primary'])
            ->withTimestamps();
    }

    public function debuggerActions(): HasMany
    {
        return $this->hasMany(DebuggerAction::class);
    }

    public function debuggerLogs(): HasMany
    {
        return $this->hasMany(DebuggerLog::class);
    }

    public function debuggerNetworkRequests(): HasMany
    {
        return $this->hasMany(DebuggerNetworkRequest::class);
    }

    public function scopeForShareToken(Builder $query, string $shareToken): Builder
    {
        return $query->where('share_token', self::hashShareToken($shareToken));
    }

    public function rememberPublicShareToken(string $shareToken): void
    {
        $this->setAttribute('public_share_token_plaintext', $shareToken);
    }

    public function hasPublicShare(): bool
    {
        return $this->visibility === ReportVisibility::Public && filled($this->share_token);
    }

    public function publicShareUrl(?string $shareToken = null): ?string
    {
        if ($this->visibility !== ReportVisibility::Public) {
            return null;
        }

        $resolvedToken = $shareToken ?? $this->getAttribute('public_share_token_plaintext');

        if (! is_string($resolvedToken) || $resolvedToken === '') {
            return null;
        }

        return route('reports.share', $resolvedToken);
    }

    public static function hashShareToken(string $shareToken): string
    {
        return HashedToken::hash($shareToken);
    }
}
