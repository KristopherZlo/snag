<?php

namespace App\Models;

use App\Enums\ArtifactKind;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportArtifact extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'bug_report_id',
        'kind',
        'disk',
        'path',
        'content_type',
        'byte_size',
        'duration_seconds',
        'checksum',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'kind' => ArtifactKind::class,
            'meta' => 'array',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function bugReport(): BelongsTo
    {
        return $this->belongsTo(BugReport::class);
    }
}
