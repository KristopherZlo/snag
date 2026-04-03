<?php

namespace App\Services\BugIssues;

use App\Models\BugIssue;
use App\Models\BugIssueShareToken;
use App\Models\BugReport;
use App\Support\ShareUrlSummary;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class BugIssuePresenter
{
    /**
     * @return array<string, mixed>
     */
    public function listItem(BugIssue $issue): array
    {
        $reports = $issue->reports->sortByDesc('created_at')->values();
        $primaryReport = $this->selectPrimaryReport($issue, $reports);
        $latestReport = $reports->first();
        $activeShareToken = $issue->shareTokens->first(fn (BugIssueShareToken $token) => $token->revoked_at === null && ($token->expires_at === null || $token->expires_at->isFuture()));
        $primaryExternal = $issue->externalLinks->firstWhere('is_primary', true) ?? $issue->externalLinks->first();

        return [
            'id' => $issue->id,
            'key' => 'BUG-'.$issue->id,
            'title' => $issue->title,
            'summary' => $issue->summary,
            'workflow_state' => $issue->workflow_state->value,
            'urgency' => $issue->urgency->value,
            'resolution' => $issue->resolution->value,
            'labels' => $issue->labels ?? [],
            'first_seen_at' => optional($issue->first_seen_at)->toIso8601String(),
            'last_seen_at' => optional($issue->last_seen_at)->toIso8601String(),
            'linked_reports_count' => $reports->count(),
            'reporters_count' => $reports->pluck('reporter_id')->filter()->unique()->count(),
            'preview' => $primaryReport ? $this->previewPayload($primaryReport) : null,
            'assignee' => $issue->assignee?->only(['id', 'name', 'email']),
            'creator' => $issue->creator?->only(['id', 'name', 'email']),
            'latest_report' => $latestReport ? $this->reportItem($latestReport) : null,
            'external_links' => $issue->externalLinks->map(fn ($link) => [
                'id' => $link->id,
                'provider' => $link->provider->value,
                'external_key' => $link->external_key,
                'external_url' => $link->external_url,
                'is_primary' => $link->is_primary,
                'sync_mode' => $link->sync_mode,
                'last_synced_at' => optional($link->last_synced_at)->toIso8601String(),
                'last_sync_error' => $link->last_sync_error,
            ])->values(),
            'primary_external_link' => $primaryExternal ? [
                'provider' => $primaryExternal->provider->value,
                'external_key' => $primaryExternal->external_key,
                'external_url' => $primaryExternal->external_url,
                'has_error' => filled($primaryExternal->last_sync_error),
            ] : null,
            'issue_url' => route('bugs.show', $issue),
            'has_guest_share' => (bool) $activeShareToken,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function detail(BugIssue $issue): array
    {
        $payload = $this->listItem($issue);

        $payload['reports'] = $issue->reports
            ->sortByDesc('created_at')
            ->map(fn (BugReport $report) => $this->reportItem($report))
            ->values()
            ->all();
        $payload['activities'] = $issue->activities
            ->sortByDesc('created_at')
            ->map(fn ($activity) => [
                'id' => $activity->id,
                'kind' => $activity->kind,
                'description' => $activity->description,
                'meta' => $activity->meta ?? [],
                'created_at' => optional($activity->created_at)->toIso8601String(),
                'user' => $activity->user?->only(['id', 'name', 'email']),
            ])
            ->values()
            ->all();
        $payload['share_tokens'] = $issue->shareTokens
            ->sortByDesc('created_at')
            ->map(fn (BugIssueShareToken $token) => [
                'id' => $token->id,
                'name' => $token->name ?: 'Guest share link',
                'expires_at' => optional($token->expires_at)->toIso8601String(),
                'revoked_at' => optional($token->revoked_at)->toIso8601String(),
                'last_accessed_at' => optional($token->last_accessed_at)->toIso8601String(),
            ])
            ->values()
            ->all();
        $payload['verification_checklist'] = array_merge([
            'reproduced' => false,
            'fix_linked' => false,
            'verified' => false,
        ], $issue->meta['verification_checklist'] ?? []);
        $payload['handoff_urls'] = [
            'markdown' => route('bugs.handoff', ['bugIssue' => $issue->id, 'format' => 'markdown']),
            'text' => route('bugs.handoff', ['bugIssue' => $issue->id, 'format' => 'text']),
            'json' => route('bugs.handoff', ['bugIssue' => $issue->id, 'format' => 'json']),
        ];

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    public function sharePayload(BugIssue $issue, BugIssueShareToken $shareToken): array
    {
        $reports = $issue->reports->sortByDesc('created_at')->values();
        $primaryReport = $this->selectPrimaryReport($issue, $reports);

        return [
            'id' => $issue->id,
            'key' => 'BUG-'.$issue->id,
            'title' => $issue->title,
            'summary' => $issue->summary,
            'workflow_state' => $issue->workflow_state->value,
            'urgency' => $issue->urgency->value,
            'resolution' => $issue->resolution->value,
            'labels' => $issue->labels ?? [],
            'preview' => $primaryReport ? $this->previewPayload($primaryReport) : null,
            'external_links' => $issue->externalLinks->map(fn ($link) => [
                'provider' => $link->provider->value,
                'external_key' => $link->external_key,
            ])->values(),
            'reports' => $reports->map(fn (BugReport $report) => [
                'id' => $report->id,
                'title' => $report->title,
                'summary' => $report->summary,
                'media_kind' => $report->media_kind,
                'created_at' => optional($report->created_at)->toIso8601String(),
                'preview' => $this->previewPayload($report),
                'reporter' => null,
                'debugger_summary' => $this->shareDebuggerSummary($report),
            ])->values(),
            'shared_at' => optional($shareToken->created_at)->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function reportItem(BugReport $report): array
    {
        return [
            'id' => $report->id,
            'title' => $report->title,
            'summary' => $report->summary,
            'status' => $report->status->value,
            'media_kind' => $report->media_kind,
            'visibility' => $report->visibility->value,
            'created_at' => optional($report->created_at)->toIso8601String(),
            'report_url' => route('reports.show', $report),
            'has_public_share' => $report->hasPublicShare(),
            'preview' => $this->previewPayload($report),
            'reporter' => $report->reporter?->only(['id', 'name', 'email']),
            'debugger_summary' => $this->debuggerSummary($report),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function createdShareLink(BugIssueShareToken $token, string $rawToken): array
    {
        return [
            'id' => $token->id,
            'name' => $token->name ?: 'Guest share link',
            'url' => route('bugs.share', $rawToken),
            'expires_at' => optional($token->expires_at)->toIso8601String(),
        ];
    }

    private function selectPrimaryReport(BugIssue $issue, Collection $reports): ?BugReport
    {
        $primaryReport = $reports->first(fn (BugReport $report) => (bool) $report->pivot?->is_primary);

        if ($primaryReport) {
            return $primaryReport;
        }

        return $reports->first();
    }

    /**
     * @return array<string, mixed>|null
     */
    private function previewPayload(BugReport $report): ?array
    {
        $previewArtifact = $report->artifacts->first(
            fn ($artifact) => in_array($artifact->kind->value, ['screenshot', 'video'], true),
        );

        if (!$previewArtifact) {
            return null;
        }

        return [
            'kind' => $previewArtifact->kind->value,
            'content_type' => $previewArtifact->content_type,
            'url' => $this->temporaryUrl($previewArtifact->path),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function debuggerSummary(BugReport $report): array
    {
        $context = $report->meta['debugger']['context'] ?? [];

        return [
            'url' => $context['url'] ?? null,
            'platform' => $context['platform'] ?? null,
            'language' => $context['language'] ?? null,
            'viewport' => $context['viewport'] ?? null,
            'steps_count' => $report->relationLoaded('debuggerActions') ? $report->debuggerActions->count() : $report->debuggerActions()->count(),
            'console_count' => $report->relationLoaded('debuggerLogs') ? $report->debuggerLogs->count() : $report->debuggerLogs()->count(),
            'network_count' => $report->relationLoaded('debuggerNetworkRequests') ? $report->debuggerNetworkRequests->count() : $report->debuggerNetworkRequests()->count(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function shareDebuggerSummary(BugReport $report): array
    {
        $context = $report->meta['debugger']['context'] ?? [];

        return [
            'url' => ShareUrlSummary::summarize($context['url'] ?? null),
            'platform' => $context['platform'] ?? null,
            'steps_count' => $report->relationLoaded('debuggerActions') ? $report->debuggerActions->count() : $report->debuggerActions()->count(),
            'console_count' => $report->relationLoaded('debuggerLogs') ? $report->debuggerLogs->count() : $report->debuggerLogs()->count(),
            'network_count' => $report->relationLoaded('debuggerNetworkRequests') ? $report->debuggerNetworkRequests->count() : $report->debuggerNetworkRequests()->count(),
        ];
    }

    private function temporaryUrl(string $path): ?string
    {
        $disk = Storage::disk(config('snag.storage.artifact_disk'));

        return method_exists($disk, 'temporaryUrl')
            ? $disk->temporaryUrl($path, now()->addMinutes((int) config('snag.capture.share_url_ttl_minutes')))
            : null;
    }
}
