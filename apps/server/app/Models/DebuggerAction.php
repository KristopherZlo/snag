<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DebuggerAction extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'bug_report_id',
        'sequence',
        'type',
        'label',
        'selector',
        'value',
        'payload',
        'happened_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
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
