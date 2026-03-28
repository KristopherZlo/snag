<?php

namespace App\Models;

use App\Enums\BugReportStatus;
use App\Enums\ReportVisibility;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class BugReport extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'upload_session_id',
        'capture_key_id',
        'reporter_id',
        'title',
        'summary',
        'media_kind',
        'status',
        'visibility',
        'share_token',
        'meta',
        'ready_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => BugReportStatus::class,
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

    public function publicShareUrl(): ?string
    {
        if ($this->visibility !== ReportVisibility::Public) {
            return null;
        }

        return route('reports.share', $this->share_token);
    }
}
