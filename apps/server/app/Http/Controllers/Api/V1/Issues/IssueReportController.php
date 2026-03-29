<?php

namespace App\Http\Controllers\Api\V1\Issues;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Issues\AttachIssueReportRequest;
use App\Models\BugIssue;
use App\Models\BugReport;
use App\Services\BugIssues\BugIssueLinkService;
use App\Services\BugIssues\BugIssuePresenter;
use Illuminate\Http\JsonResponse;

class IssueReportController extends Controller
{
    public function __construct(
        private readonly BugIssueLinkService $links,
        private readonly BugIssuePresenter $presenter,
    ) {
    }

    public function store(AttachIssueReportRequest $request, BugIssue $bugIssue): JsonResponse
    {
        $report = BugReport::query()
            ->where('organization_id', $bugIssue->organization_id)
            ->findOrFail($request->validated('report_id'));

        $this->authorize('update', $report);

        $this->links->attachReport(
            $bugIssue,
            $report,
            $request->user(),
            (bool) ($request->validated('is_primary') ?? false),
        );

        $bugIssue->load(['reports.artifacts', 'reports.reporter', 'externalLinks', 'shareTokens', 'assignee', 'creator', 'activities.user']);

        return response()->json([
            'issue' => $this->presenter->detail($bugIssue),
        ], 201);
    }

    public function destroy(\Illuminate\Http\Request $request, BugIssue $bugIssue, BugReport $bugReport): JsonResponse
    {
        $this->authorize('update', $bugIssue);
        $this->authorize('update', $bugReport);

        $this->links->detachReport($bugIssue, $bugReport, $request->user());
        $bugIssue->load(['reports.artifacts', 'reports.reporter', 'externalLinks', 'shareTokens', 'assignee', 'creator', 'activities.user']);

        return response()->json([
            'issue' => $this->presenter->detail($bugIssue),
        ]);
    }
}
