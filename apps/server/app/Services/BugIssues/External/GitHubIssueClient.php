<?php

namespace App\Services\BugIssues\External;

use App\Models\BugIssue;
use App\Models\BugIssueExternalLink;
use App\Models\OrganizationIntegration;
use App\Services\BugIssues\BugIssueHandoffService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class GitHubIssueClient
{
    public function __construct(
        private readonly BugIssueHandoffService $handoff,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function create(OrganizationIntegration $integration, BugIssue $issue): array
    {
        $config = $integration->config ?? [];
        $repository = (string) ($config['repository'] ?? '');
        $baseUrl = rtrim((string) ($config['api_base_url'] ?? 'https://api.github.com'), '/');
        $token = (string) ($config['token'] ?? '');

        $response = Http::withToken($token)
            ->acceptJson()
            ->post("{$baseUrl}/repos/{$repository}/issues", [
                'title' => $issue->title,
                'body' => $this->handoff->asMarkdown($issue),
                'labels' => array_values(array_filter(array_merge(
                    $issue->labels ?? [],
                    [$issue->urgency->value, $issue->workflow_state->value],
                ))),
            ])
            ->throw()
            ->json();

        return [
            'external_key' => '#'.$response['number'],
            'external_id' => (string) $response['id'],
            'external_url' => $response['html_url'],
            'external_snapshot' => [
                'state' => $response['state'],
                'labels' => $response['labels'],
                'assignees' => $response['assignees'] ?? [],
                'updated_at' => $response['updated_at'] ?? null,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function sync(OrganizationIntegration $integration, BugIssueExternalLink $link, BugIssue $issue): array
    {
        $config = $integration->config ?? [];
        $repository = (string) ($config['repository'] ?? '');
        $baseUrl = rtrim((string) ($config['api_base_url'] ?? 'https://api.github.com'), '/');
        $token = (string) ($config['token'] ?? '');
        $issueNumber = ltrim($link->external_key, '#');

        $response = Http::withToken($token)
            ->acceptJson()
            ->patch("{$baseUrl}/repos/{$repository}/issues/{$issueNumber}", [
                'title' => $issue->title,
                'body' => $this->handoff->asMarkdown($issue),
                'state' => $issue->workflow_state->value === 'done' ? 'closed' : 'open',
                'labels' => array_values(array_filter(array_merge(
                    $issue->labels ?? [],
                    [$issue->urgency->value, $issue->workflow_state->value],
                ))),
            ])
            ->throw()
            ->json();

        return [
            'external_url' => $response['html_url'],
            'external_snapshot' => [
                'state' => $response['state'],
                'labels' => $response['labels'],
                'assignees' => $response['assignees'] ?? [],
                'updated_at' => $response['updated_at'] ?? null,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function applyWebhook(BugIssueExternalLink $link, array $payload): array
    {
        $issuePayload = $payload['issue'] ?? [];
        $labelNames = collect($issuePayload['labels'] ?? [])->pluck('name')->filter()->values()->all();
        $state = (string) ($issuePayload['state'] ?? 'open');
        $workflowState = $state === 'closed' ? 'done' : 'triaged';

        foreach ($labelNames as $label) {
            $normalized = Str::of((string) $label)->lower()->replace('-', '_')->replace(' ', '_')->toString();

            if (in_array($normalized, ['ready_to_verify', 'qa', 'needs_verification'], true)) {
                $workflowState = 'ready_to_verify';
            }

            if (in_array($normalized, ['in_progress', 'doing', 'working'], true)) {
                $workflowState = 'in_progress';
            }
        }

        return [
            'workflow_state' => $workflowState,
            'resolution' => $state === 'closed' ? 'fixed' : $link->issue->resolution->value,
            'external_url' => $issuePayload['html_url'] ?? $link->external_url,
            'external_snapshot' => [
                'state' => $state,
                'labels' => $labelNames,
                'assignees' => $issuePayload['assignees'] ?? [],
                'updated_at' => $issuePayload['updated_at'] ?? null,
            ],
        ];
    }
}
