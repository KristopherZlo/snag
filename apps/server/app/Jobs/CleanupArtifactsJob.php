<?php

namespace App\Jobs;

use App\Enums\BugReportStatus;
use App\Models\BugReport;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;

class CleanupArtifactsJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $reportId) {}

    public function handle(): void
    {
        $report = BugReport::withTrashed()->with('artifacts')->find($this->reportId);

        if (! $report) {
            return;
        }

        foreach ($report->artifacts as $artifact) {
            Storage::disk($artifact->disk)->delete($artifact->path);
            $artifact->delete();
        }

        $report->forceFill([
            'status' => BugReportStatus::Deleted,
        ])->save();
    }
}
