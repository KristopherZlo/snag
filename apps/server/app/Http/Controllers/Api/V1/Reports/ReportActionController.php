<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Enums\BugReportStatus;
use App\Http\Controllers\Controller;
use App\Jobs\CleanupArtifactsJob;
use App\Jobs\IngestDebuggerArtifactJob;
use App\Models\BugReport;
use Illuminate\Http\Request;

class ReportActionController extends Controller
{
    public function retry(Request $request, BugReport $bugReport)
    {
        $this->authorize('retryIngestion', $bugReport);

        $bugReport->forceFill([
            'status' => BugReportStatus::Processing,
        ])->save();

        IngestDebuggerArtifactJob::dispatch($bugReport->id);

        return response()->json([
            'status' => $bugReport->status->value,
        ]);
    }

    public function destroy(Request $request, BugReport $bugReport)
    {
        $this->authorize('delete', $bugReport);

        $bugReport->delete();
        CleanupArtifactsJob::dispatch($bugReport->id);

        return response()->json([
            'deleted' => true,
        ]);
    }
}
