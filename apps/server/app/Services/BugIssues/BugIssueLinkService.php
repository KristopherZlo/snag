<?php

namespace App\Services\BugIssues;

use App\Enums\BugIssueResolution;
use App\Enums\BugIssueWorkflowState;
use App\Models\BugIssue;
use App\Models\BugIssueReport;
use App\Models\BugReport;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BugIssueLinkService
{
    public function __construct(
        private readonly BugIssueActivityService $activities,
    ) {
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(Organization $organization, User $actor, array $attributes, ?BugReport $report = null): BugIssue
    {
        return DB::transaction(function () use ($organization, $actor, $attributes, $report) {
            $issue = BugIssue::query()->create([
                'organization_id' => $organization->id,
                'creator_id' => $actor->id,
                'assignee_id' => $attributes['assignee_id'] ?? null,
                'title' => $attributes['title'] ?? $report?->title ?? 'Untitled issue',
                'summary' => $attributes['summary'] ?? $report?->summary,
                'workflow_state' => $attributes['workflow_state'] ?? BugIssueWorkflowState::Inbox->value,
                'urgency' => $attributes['urgency'] ?? $report?->urgency?->value ?? 'medium',
                'resolution' => $attributes['resolution'] ?? BugIssueResolution::Unresolved->value,
                'labels' => $attributes['labels'] ?? null,
                'meta' => [
                    'verification_checklist' => [
                        'reproduced' => false,
                        'fix_linked' => false,
                        'verified' => false,
                    ],
                ],
                'first_seen_at' => $report?->created_at,
                'last_seen_at' => $report?->created_at,
            ]);

            $this->activities->record($issue, 'issue.created', 'Issue created in Snag.', $actor);

            if ($report) {
                $this->attachReport($issue, $report, $actor, true);
            }

            return $issue->fresh();
        });
    }

    public function attachReport(BugIssue $issue, BugReport $report, User $actor, bool $makePrimary = false): BugIssueReport
    {
        if ($issue->organization_id !== $report->organization_id) {
            throw ValidationException::withMessages([
                'report_id' => 'This report belongs to another organization.',
            ]);
        }

        $existingAttachment = BugIssueReport::query()
            ->where('bug_report_id', $report->id)
            ->first();

        if ($existingAttachment && $existingAttachment->bug_issue_id !== $issue->id) {
            throw ValidationException::withMessages([
                'report_id' => 'This report is already attached to another issue.',
            ]);
        }

        $attachment = DB::transaction(function () use ($issue, $report, $actor, $makePrimary, $existingAttachment) {
            if ($makePrimary || !$issue->attachments()->exists()) {
                $issue->attachments()->update(['is_primary' => false]);
            }

            if ($existingAttachment) {
                $existingAttachment->forceFill([
                    'is_primary' => $makePrimary || !$issue->attachments()->where('is_primary', true)->exists(),
                ])->save();
                $attachment = $existingAttachment;
            } else {
                $attachment = $issue->attachments()->create([
                    'bug_report_id' => $report->id,
                    'attached_by_user_id' => $actor->id,
                    'is_primary' => $makePrimary || !$issue->attachments()->exists(),
                ]);
            }

            $this->syncSeenWindow($issue, $report);

            if (blank($issue->summary) && filled($report->summary)) {
                $issue->forceFill(['summary' => $report->summary])->save();
            }

            $this->activities->record(
                $issue,
                'report.attached',
                "Attached report #{$report->id} to the issue.",
                $actor,
                ['report_id' => $report->id],
            );

            return $attachment->fresh();
        });

        return $attachment;
    }

    public function detachReport(BugIssue $issue, BugReport $report, User $actor): void
    {
        DB::transaction(function () use ($issue, $report, $actor) {
            $attachment = BugIssueReport::query()
                ->where('bug_issue_id', $issue->id)
                ->where('bug_report_id', $report->id)
                ->first();

            if (!$attachment) {
                return;
            }

            $wasPrimary = $attachment->is_primary;
            $attachment->delete();

            if ($wasPrimary) {
                $next = $issue->attachments()->latest('id')->first();

                if ($next) {
                    $next->forceFill(['is_primary' => true])->save();
                }
            }

            $this->recalculateSeenWindow($issue);

            $this->activities->record(
                $issue,
                'report.detached',
                "Detached report #{$report->id} from the issue.",
                $actor,
                ['report_id' => $report->id],
            );
        });
    }

    public function syncSeenWindow(BugIssue $issue, BugReport $report): void
    {
        $firstSeenAt = $issue->first_seen_at;
        $lastSeenAt = $issue->last_seen_at;
        $reportCreatedAt = $report->created_at;

        $issue->forceFill([
            'first_seen_at' => $firstSeenAt && $reportCreatedAt && $firstSeenAt->lte($reportCreatedAt)
                ? $firstSeenAt
                : ($reportCreatedAt ?? $firstSeenAt),
            'last_seen_at' => $lastSeenAt && $reportCreatedAt && $lastSeenAt->gte($reportCreatedAt)
                ? $lastSeenAt
                : ($reportCreatedAt ?? $lastSeenAt),
        ])->save();
    }

    private function recalculateSeenWindow(BugIssue $issue): void
    {
        $reportDates = $issue->reports()->pluck('bug_reports.created_at');

        $issue->forceFill([
            'first_seen_at' => $reportDates->min(),
            'last_seen_at' => $reportDates->max(),
        ])->save();
    }
}
