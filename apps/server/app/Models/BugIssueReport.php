<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class BugIssueReport extends Pivot
{
    protected $table = 'bug_issue_reports';

    public $incrementing = true;

    protected $fillable = [
        'bug_issue_id',
        'bug_report_id',
        'attached_by_user_id',
        'is_primary',
    ];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
        ];
    }

    public function issue(): BelongsTo
    {
        return $this->belongsTo(BugIssue::class, 'bug_issue_id');
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(BugReport::class, 'bug_report_id');
    }

    public function attachedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'attached_by_user_id');
    }
}
