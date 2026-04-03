<?php

namespace App\Http\Controllers\Api\V1\Issues;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Issues\StoreIssueShareTokenRequest;
use App\Models\BugIssue;
use App\Models\BugIssueShareToken;
use App\Services\BugIssues\BugIssueActivityService;
use App\Services\BugIssues\BugIssuePresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class IssueShareController extends Controller
{
    public function __construct(
        private readonly BugIssuePresenter $presenter,
        private readonly BugIssueActivityService $activities,
    ) {
    }

    public function store(StoreIssueShareTokenRequest $request, BugIssue $bugIssue): JsonResponse
    {
        $rawToken = Str::lower(Str::random(40));

        $token = $bugIssue->shareTokens()->create([
            'created_by_user_id' => $request->user()->id,
            'name' => $request->validated('name'),
            'token' => $rawToken,
            'expires_at' => $request->validated('expires_at'),
        ]);

        $this->activities->record($bugIssue, 'share.created', 'Created a guest share link.', $request->user(), [
            'share_token_id' => $token->id,
        ]);

        $bugIssue->load(['reports.artifacts', 'reports.reporter', 'externalLinks', 'shareTokens', 'assignee', 'creator', 'activities.user']);

        return response()->json([
            'issue' => $this->presenter->detail($bugIssue),
            'share' => $this->presenter->createdShareLink($token, $rawToken),
        ], 201);
    }

    public function destroy(\Illuminate\Http\Request $request, BugIssue $bugIssue, BugIssueShareToken $shareToken): JsonResponse
    {
        $this->authorize('manageSharing', $bugIssue);

        abort_unless($shareToken->bug_issue_id === $bugIssue->id, 404);

        $shareToken->forceFill(['revoked_at' => now()])->save();

        $this->activities->record($bugIssue, 'share.revoked', 'Revoked a guest share link.', $request->user(), [
            'share_token_id' => $shareToken->id,
        ]);

        $bugIssue->load(['reports.artifacts', 'reports.reporter', 'externalLinks', 'shareTokens', 'assignee', 'creator', 'activities.user']);

        return response()->json([
            'issue' => $this->presenter->detail($bugIssue),
        ]);
    }
}
