<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Reports\FinalizeReportRequest;
use App\Models\UploadSession;
use App\Services\Reports\ReportWorkflowService;

class FinalizeReportController extends Controller
{
    public function store(FinalizeReportRequest $request, ReportWorkflowService $workflow)
    {
        $session = UploadSession::query()
            ->where('token', $request->string('upload_session_token'))
            ->where('finalize_token', $request->string('finalize_token'))
            ->where('organization_id', $request->user()->active_organization_id)
            ->with('organization')
            ->firstOrFail();

        $report = $workflow->finalize($session, $request->validated());

        return response()->json([
            'report' => [
                'id' => $report->id,
                'status' => $report->status->value,
                'report_url' => route('reports.show', $report),
                'share_url' => $report->publicShareUrl(),
            ],
        ]);
    }
}
