<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Enums\BugReportStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Reports\UpdateReportTriageRequest;
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

    public function updateTriage(UpdateReportTriageRequest $request, BugReport $bugReport)
    {
        $validated = $request->validated();
        $updates = [];

        if (array_key_exists('workflow_state', $validated)) {
            $updates['workflow_state'] = $validated['workflow_state'];
        }

        if (array_key_exists('urgency', $validated)) {
            $updates['urgency'] = $validated['urgency'];
        }

        if (array_key_exists('tag', $validated)) {
            $updates['triage_tag'] = $validated['tag'];
        }

        if ($updates !== []) {
            $bugReport->forceFill($updates)->save();
            $bugReport->refresh();
        }

        return response()->json([
            'workflow_state' => $bugReport->workflow_state->value,
            'urgency' => $bugReport->urgency->value,
            'tag' => $bugReport->triage_tag->value,
        ]);
    }
}
