<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DebuggerNetworkRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'bug_report_id',
        'sequence',
        'method',
        'url',
        'status_code',
        'duration_ms',
        'request_headers',
        'response_headers',
        'meta',
        'happened_at',
    ];

    protected function casts(): array
    {
        return [
            'request_headers' => 'array',
            'response_headers' => 'array',
            'meta' => 'array',
            'happened_at' => 'datetime',
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
