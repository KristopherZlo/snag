<?php

namespace App\Services\BugIssues;

use App\Models\BugIssue;

class BugIssueHandoffService
{
    /**
     * @return array<string, mixed>
     */
    public function asArray(BugIssue $issue): array
    {
        $reports = $issue->reports->sortByDesc('created_at')->values();
        $primaryReport = $reports->first();
        $primaryExternal = $issue->externalLinks->firstWhere('is_primary', true) ?? $issue->externalLinks->first();

        return [
            'key' => 'BUG-'.$issue->id,
            'title' => $issue->title,
            'summary' => $issue->summary,
            'workflow_state' => $issue->workflow_state->value,
            'urgency' => $issue->urgency->value,
            'resolution' => $issue->resolution->value,
            'labels' => $issue->labels ?? [],
            'snag_issue_url' => route('bugs.show', $issue),
            'has_guest_share' => (bool) $issue->shareTokens->first(fn ($token) => $token->revoked_at === null && ($token->expires_at === null || $token->expires_at->isFuture())),
            'external_ticket' => $primaryExternal ? [
                'provider' => $primaryExternal->provider->value,
                'key' => $primaryExternal->external_key,
                'url' => $primaryExternal->external_url,
            ] : null,
            'first_seen_at' => optional($issue->first_seen_at)->toIso8601String(),
            'last_seen_at' => optional($issue->last_seen_at)->toIso8601String(),
            'assignee' => $issue->assignee?->only(['id', 'name', 'email']),
            'reports' => $reports->map(fn ($report) => [
                'id' => $report->id,
                'title' => $report->title,
                'summary' => $report->summary,
                'report_url' => route('reports.show', $report),
                'has_public_share' => $report->hasPublicShare(),
                'media_kind' => $report->media_kind,
                'created_at' => optional($report->created_at)->toIso8601String(),
                'reporter' => $report->reporter?->only(['name', 'email']),
            ])->values()->all(),
            'environment' => [
                'url' => $primaryReport->meta['debugger']['context']['url'] ?? null,
                'platform' => $primaryReport->meta['debugger']['context']['platform'] ?? null,
                'user_agent' => $primaryReport->meta['debugger']['context']['user_agent'] ?? null,
                'viewport' => $primaryReport->meta['debugger']['context']['viewport'] ?? null,
            ],
            'evidence' => [
                'linked_reports_count' => $reports->count(),
                'console_events' => $primaryReport?->debuggerLogs()->count() ?? 0,
                'network_requests' => $primaryReport?->debuggerNetworkRequests()->count() ?? 0,
                'steps' => $primaryReport?->debuggerActions()->count() ?? 0,
            ],
        ];
    }

    public function asMarkdown(BugIssue $issue): string
    {
        $payload = $this->asArray($issue);
        $lines = [
            '# '.$payload['key'].' '.$payload['title'],
            '',
            $payload['summary'] ?: 'No summary provided.',
            '',
            '- Workflow: '.$payload['workflow_state'],
            '- Urgency: '.$payload['urgency'],
            '- Resolution: '.$payload['resolution'],
            '- Snag issue: '.$payload['snag_issue_url'],
        ];

        if ($payload['external_ticket']) {
            $lines[] = '- External ticket: '.$payload['external_ticket']['provider'].' '.$payload['external_ticket']['key'].' '.$payload['external_ticket']['url'];
        }

        if ($payload['has_guest_share']) {
            $lines[] = '- Guest share: active (URL revealed only when created)';
        }

        $lines[] = '';
        $lines[] = '## Reports';

        foreach ($payload['reports'] as $report) {
            $lines[] = sprintf(
                '- #%s %s (%s) %s',
                $report['id'],
                $report['title'],
                $report['media_kind'],
                $report['report_url'],
            );
        }

        $lines[] = '';
        $lines[] = '## Environment';
        $lines[] = '- URL: '.($payload['environment']['url'] ?? 'n/a');
        $lines[] = '- Platform: '.($payload['environment']['platform'] ?? 'n/a');

        return implode("\n", $lines);
    }

    public function asText(BugIssue $issue): string
    {
        $payload = $this->asArray($issue);

        return implode(PHP_EOL, [
            $payload['key'].' '.$payload['title'],
            $payload['summary'] ?: 'No summary provided.',
            'Workflow: '.$payload['workflow_state'],
            'Urgency: '.$payload['urgency'],
            'Resolution: '.$payload['resolution'],
            'Snag issue: '.$payload['snag_issue_url'],
            'Linked reports: '.count($payload['reports']),
            'Environment URL: '.($payload['environment']['url'] ?? 'n/a'),
        ]);
    }
}
