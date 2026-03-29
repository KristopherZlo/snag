<?php

namespace App\Http\Controllers\Api\V1\Issues;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Issues\StoreIssueExternalLinkRequest;
use App\Models\BugIssue;
use App\Models\BugIssueExternalLink;
use App\Services\BugIssues\BugIssuePresenter;
use App\Services\BugIssues\IssueExternalLinkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IssueExternalLinkController extends Controller
{
    public function __construct(
        private readonly IssueExternalLinkService $links,
        private readonly BugIssuePresenter $presenter,
    ) {
    }

    public function store(StoreIssueExternalLinkRequest $request, BugIssue $bugIssue): JsonResponse
    {
        $this->links->createOrLink($bugIssue, $request->user(), $request->validated());

        $bugIssue->load(['reports.artifacts', 'reports.reporter', 'externalLinks', 'shareTokens', 'assignee', 'creator', 'activities.user']);

        return response()->json([
            'issue' => $this->presenter->detail($bugIssue),
        ], 201);
    }

    public function sync(Request $request, BugIssue $bugIssue, BugIssueExternalLink $externalLink): JsonResponse
    {
        $this->authorize('update', $bugIssue);
        abort_unless($externalLink->bug_issue_id === $bugIssue->id, 404);

        $this->links->sync($externalLink->load('issue'), $request->user());
        $bugIssue->load(['reports.artifacts', 'reports.reporter', 'externalLinks', 'shareTokens', 'assignee', 'creator', 'activities.user']);

        return response()->json([
            'issue' => $this->presenter->detail($bugIssue),
        ]);
    }

    public function destroy(Request $request, BugIssue $bugIssue, BugIssueExternalLink $externalLink): JsonResponse
    {
        $this->authorize('update', $bugIssue);
        abort_unless($externalLink->bug_issue_id === $bugIssue->id, 404);

        $this->links->revoke($externalLink->load('issue'), $request->user());
        $bugIssue->load(['reports.artifacts', 'reports.reporter', 'externalLinks', 'shareTokens', 'assignee', 'creator', 'activities.user']);

        return response()->json([
            'issue' => $this->presenter->detail($bugIssue),
        ]);
    }
}
