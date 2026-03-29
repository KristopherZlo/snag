<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Models\BugIssue;
use App\Models\BugReport;
use App\Models\Organization;
use App\Services\BugIssues\BugIssueLinkService;
use App\Services\BugIssues\BugIssuePresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportIssueController extends Controller
{
    public function __construct(
        private readonly BugIssueLinkService $links,
        private readonly BugIssuePresenter $presenter,
    ) {
    }

    public function store(Request $request, BugReport $bugReport): JsonResponse
    {
        $this->authorize('update', $bugReport);
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');

        $validated = $request->validate([
            'bug_issue_id' => ['nullable', 'integer', 'exists:bug_issues,id'],
            'title' => ['nullable', 'string', 'max:255'],
            'summary' => ['nullable', 'string'],
        ]);

        if (!empty($validated['bug_issue_id'])) {
            $issue = BugIssue::query()
                ->where('organization_id', $organization->id)
                ->findOrFail($validated['bug_issue_id']);

            $this->authorize('update', $issue);
            $this->links->attachReport($issue, $bugReport, $request->user());
        } else {
            $issue = $this->links->create($organization, $request->user(), $validated, $bugReport);
        }

        $issue->load(['reports.artifacts', 'reports.reporter', 'externalLinks', 'shareTokens', 'assignee', 'creator', 'activities.user']);

        return response()->json([
            'issue' => $this->presenter->detail($issue),
        ], 201);
    }
}
