<?php

namespace App\Services\BugIssues\External;

use App\Models\BugIssue;
use App\Models\BugIssueExternalLink;
use App\Models\OrganizationIntegration;
use App\Services\BugIssues\BugIssueHandoffService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class JiraIssueClient
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
        $baseUrl = rtrim((string) ($config['base_url'] ?? ''), '/');
        $email = (string) ($config['email'] ?? '');
        $token = (string) ($config['api_token'] ?? '');
        $projectKey = (string) ($config['project_key'] ?? '');
        $issueType = (string) ($config['issue_type'] ?? 'Task');

        $response = Http::withBasicAuth($email, $token)
            ->acceptJson()
            ->post("{$baseUrl}/rest/api/3/issue", [
                'fields' => [
                    'project' => ['key' => $projectKey],
                    'summary' => $issue->title,
                    'issuetype' => ['name' => $issueType],
                    'priority' => ['name' => $this->priorityForUrgency($issue->urgency->value)],
                    'description' => $this->descriptionDocument($this->handoff->asMarkdown($issue)),
                ],
            ])
            ->throw()
            ->json();

        return [
            'external_key' => $response['key'],
            'external_id' => (string) $response['id'],
            'external_url' => "{$baseUrl}/browse/{$response['key']}",
            'external_snapshot' => [
                'status' => 'created',
                'updated_at' => now()->toIso8601String(),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function sync(OrganizationIntegration $integration, BugIssueExternalLink $link, BugIssue $issue): array
    {
        $config = $integration->config ?? [];
        $baseUrl = rtrim((string) ($config['base_url'] ?? ''), '/');
        $email = (string) ($config['email'] ?? '');
        $token = (string) ($config['api_token'] ?? '');

        Http::withBasicAuth($email, $token)
            ->acceptJson()
            ->put("{$baseUrl}/rest/api/3/issue/{$link->external_key}", [
                'fields' => [
                    'summary' => $issue->title,
                    'priority' => ['name' => $this->priorityForUrgency($issue->urgency->value)],
                    'description' => $this->descriptionDocument($this->handoff->asMarkdown($issue)),
                ],
            ])
            ->throw();

        return [
            'external_url' => "{$baseUrl}/browse/{$link->external_key}",
            'external_snapshot' => [
                'status' => 'synced',
                'updated_at' => now()->toIso8601String(),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function applyWebhook(BugIssueExternalLink $link, array $payload): array
    {
        $issuePayload = $payload['issue'] ?? [];
        $fields = $issuePayload['fields'] ?? [];
        $statusName = Str::of((string) ($fields['status']['name'] ?? ''))->lower()->replace('-', ' ')->toString();
        $statusCategory = Str::of((string) ($fields['status']['statusCategory']['key'] ?? ''))->lower()->toString();
        $resolutionName = Str::of((string) ($fields['resolution']['name'] ?? ''))->lower()->replace('-', ' ')->replace('/', ' ')->toString();

        $workflowState = match (true) {
            $statusCategory === 'done' => 'done',
            Str::contains($statusName, ['verify', 'qa', 'test']) => 'ready_to_verify',
            Str::contains($statusName, ['progress', 'develop', 'doing']) => 'in_progress',
            default => 'triaged',
        };

        $resolution = match (true) {
            Str::contains($resolutionName, ['duplicate']) => 'duplicate',
            Str::contains($resolutionName, ['won t fix', 'wont fix']) => 'wontfix',
            Str::contains($resolutionName, ['cannot reproduce', 'unreproducible']) => 'unreproducible',
            Str::contains($resolutionName, ['blocked']) => 'blocked',
            $workflowState === 'done' => 'fixed',
            default => $link->issue->resolution->value,
        };

        return [
            'workflow_state' => $workflowState,
            'resolution' => $resolution,
            'external_url' => rtrim((string) $link->external_url, '/'),
            'external_snapshot' => [
                'status' => $fields['status']['name'] ?? null,
                'resolution' => $fields['resolution']['name'] ?? null,
                'assignee' => $fields['assignee']['displayName'] ?? null,
                'updated_at' => now()->toIso8601String(),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function descriptionDocument(string $body): array
    {
        return [
            'type' => 'doc',
            'version' => 1,
            'content' => [
                [
                    'type' => 'paragraph',
                    'content' => [
                        [
                            'type' => 'text',
                            'text' => $body,
                        ],
                    ],
                ],
            ],
        ];
    }

    private function priorityForUrgency(string $urgency): string
    {
        return match ($urgency) {
            'critical' => 'Highest',
            'high' => 'High',
            'low' => 'Low',
            default => 'Medium',
        };
    }
}
