<?php

namespace App\Http\Controllers\Api\V1\Issues;

use App\Enums\BugIssueResolution;
use App\Enums\BugIssueWorkflowState;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Issues\StoreBugIssueRequest;
use App\Http\Requests\Api\V1\Issues\UpdateBugIssueRequest;
use App\Models\BugIssue;
use App\Models\BugReport;
use App\Models\Organization;
use App\Services\BugIssues\BugIssueActivityService;
use App\Services\BugIssues\BugIssueLinkService;
use App\Services\BugIssues\BugIssuePresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class IssueController extends Controller
{
    public function __construct(
        private readonly BugIssueLinkService $links,
        private readonly BugIssuePresenter $presenter,
        private readonly BugIssueActivityService $activities,
    ) {
    }

    public function store(StoreBugIssueRequest $request): JsonResponse
    {
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');
        $validated = $request->validated();

        $assigneeId = $validated['assignee_id'] ?? null;
        $this->ensureAssigneeBelongsToOrganization($organization, $assigneeId);

        $report = null;

        if (!empty($validated['report_id'])) {
            $report = BugReport::query()->where('organization_id', $organization->id)->findOrFail($validated['report_id']);
            $this->authorize('update', $report);
        }

        $issue = $this->links->create($organization, $request->user(), $validated, $report);

        $issue->load(['reports.artifacts', 'reports.reporter', 'externalLinks', 'shareTokens', 'assignee', 'creator', 'activities.user']);

        return response()->json([
            'issue' => $this->presenter->detail($issue),
        ], 201);
    }

    public function update(UpdateBugIssueRequest $request, BugIssue $bugIssue): JsonResponse
    {
        $validated = $request->validated();

        $this->ensureAssigneeBelongsToOrganization($bugIssue->organization, $validated['assignee_id'] ?? null);
        $this->ensureDoneIssuesHaveResolution(
            $validated['workflow_state'] ?? $bugIssue->workflow_state->value,
            $validated['resolution'] ?? $bugIssue->resolution->value,
        );

        $original = $bugIssue->only(['title', 'summary', 'workflow_state', 'urgency', 'resolution', 'assignee_id', 'labels', 'meta']);
        $meta = $bugIssue->meta ?? [];

        if (array_key_exists('verification_checklist', $validated)) {
            $meta['verification_checklist'] = $validated['verification_checklist'];
        }

        $bugIssue->forceFill([
            'title' => $validated['title'] ?? $bugIssue->title,
            'summary' => array_key_exists('summary', $validated) ? $validated['summary'] : $bugIssue->summary,
            'workflow_state' => $validated['workflow_state'] ?? $bugIssue->workflow_state->value,
            'urgency' => $validated['urgency'] ?? $bugIssue->urgency->value,
            'resolution' => $validated['resolution'] ?? $bugIssue->resolution->value,
            'assignee_id' => array_key_exists('assignee_id', $validated) ? $validated['assignee_id'] : $bugIssue->assignee_id,
            'labels' => $validated['labels'] ?? $bugIssue->labels,
            'meta' => $meta,
        ])->save();

        $changes = [];

        foreach (['title', 'summary', 'workflow_state', 'urgency', 'resolution', 'assignee_id', 'labels', 'meta'] as $field) {
            if (($original[$field] ?? null) !== $bugIssue->getAttribute($field)) {
                $changes[$field] = [
                    'from' => $original[$field] ?? null,
                    'to' => $bugIssue->getAttribute($field),
                ];
            }
        }

        if ($changes !== []) {
            $this->activities->record(
                $bugIssue,
                'issue.updated',
                'Updated issue details.',
                $request->user(),
                ['changes' => $changes],
            );
        }

        $bugIssue->load(['reports.artifacts', 'reports.reporter', 'externalLinks', 'shareTokens', 'assignee', 'creator', 'activities.user']);

        return response()->json([
            'issue' => $this->presenter->detail($bugIssue),
        ]);
    }

    public function destroy(Request $request, BugIssue $bugIssue): JsonResponse
    {
        $this->authorize('delete', $bugIssue);

        $bugIssue->delete();

        return response()->json([
            'deleted' => true,
        ]);
    }

    private function ensureAssigneeBelongsToOrganization(Organization $organization, ?int $assigneeId): void
    {
        if ($assigneeId === null) {
            return;
        }

        $isMember = $organization->memberships()->where('user_id', $assigneeId)->exists();

        if (!$isMember) {
            throw ValidationException::withMessages([
                'assignee_id' => 'Assignee must belong to the active organization.',
            ]);
        }
    }

    private function ensureDoneIssuesHaveResolution(string $workflowState, string $resolution): void
    {
        if ($workflowState !== BugIssueWorkflowState::Done->value) {
            return;
        }

        if ($resolution === BugIssueResolution::Unresolved->value) {
            throw ValidationException::withMessages([
                'resolution' => 'Done issues must have a final resolution.',
            ]);
        }
    }
}
