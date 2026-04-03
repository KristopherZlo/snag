<?php

namespace Tests\Feature\Integrations;

use App\Enums\BugIssueExternalProvider;
use App\Enums\BugIssueResolution;
use App\Enums\BugIssueWorkflowState;
use App\Enums\BugUrgency;
use App\Models\BugIssue;
use App\Models\BugIssueExternalLink;
use App\Models\Organization;
use App\Models\OrganizationIntegration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class WebhookIsolationTest extends TestCase
{
    use CreatesOrganizations;
    use RefreshDatabase;

    public function test_github_webhook_scopes_external_link_lookup_to_the_integration_organization(): void
    {
        $owner = User::factory()->create();
        $organizationA = $this->createOrganizationFor($owner, name: 'Org A');
        $organizationB = $this->createOrganizationFor(User::factory()->create(), name: 'Org B');

        $integrationA = $this->createIntegration($organizationA, BugIssueExternalProvider::GitHub, true, 'secret-a');
        $this->createIntegration($organizationB, BugIssueExternalProvider::GitHub, true, 'secret-b');

        $issueB = $this->createIssue($organizationB, 'Org B issue');
        $this->createExternalLink($issueB, BugIssueExternalProvider::GitHub, '#404', 'shared-external-id');

        $issueA = $this->createIssue($organizationA, 'Org A issue');
        $this->createExternalLink($issueA, BugIssueExternalProvider::GitHub, '#404', 'shared-external-id');

        $payload = [
            'issue' => [
                'id' => 'shared-external-id',
                'number' => 404,
                'state' => 'closed',
                'html_url' => 'https://github.com/acme/repo/issues/404',
                'labels' => [
                    ['name' => 'qa'],
                ],
                'assignees' => [],
                'updated_at' => now()->toIso8601String(),
            ],
        ];
        $content = json_encode($payload, JSON_THROW_ON_ERROR);

        $response = $this->call(
            'POST',
            route('api.v1.webhooks.github', $integrationA),
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_HUB_SIGNATURE_256' => 'sha256='.hash_hmac('sha256', $content, 'secret-a'),
            ],
            $content,
        );

        $response->assertOk()
            ->assertJsonPath('issue_id', $issueA->id);

        $this->assertSame(BugIssueWorkflowState::ReadyToVerify, $issueA->fresh()->workflow_state);
        $this->assertSame(BugIssueResolution::Fixed, $issueA->fresh()->resolution);
        $this->assertSame(BugIssueWorkflowState::Triaged, $issueB->fresh()->workflow_state);
        $this->assertSame(BugIssueResolution::Unresolved, $issueB->fresh()->resolution);
    }

    public function test_disabled_github_integrations_reject_webhooks_without_mutating_issue_state(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganizationFor($owner);
        $integration = $this->createIntegration($organization, BugIssueExternalProvider::GitHub, false, 'disabled-secret');
        $issue = $this->createIssue($organization, 'Disabled GitHub webhook target');
        $this->createExternalLink($issue, BugIssueExternalProvider::GitHub, '#22', 'disabled-external-id');

        $payload = [
            'issue' => [
                'id' => 'disabled-external-id',
                'number' => 22,
                'state' => 'closed',
                'html_url' => 'https://github.com/acme/repo/issues/22',
            ],
        ];
        $content = json_encode($payload, JSON_THROW_ON_ERROR);

        $response = $this->call(
            'POST',
            route('api.v1.webhooks.github', $integration),
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_HUB_SIGNATURE_256' => 'sha256='.hash_hmac('sha256', $content, 'disabled-secret'),
            ],
            $content,
        );

        $response->assertNotFound();
        $this->assertSame(BugIssueWorkflowState::Triaged, $issue->fresh()->workflow_state);
        $this->assertSame(BugIssueResolution::Unresolved, $issue->fresh()->resolution);
    }

    public function test_disabled_jira_integrations_reject_webhooks_without_mutating_issue_state(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganizationFor($owner);
        $integration = $this->createIntegration($organization, BugIssueExternalProvider::Jira, false, 'jira-secret');
        $issue = $this->createIssue($organization, 'Disabled Jira webhook target');
        $this->createExternalLink($issue, BugIssueExternalProvider::Jira, 'JIRA-22', 'jira-external-id');

        $payload = [
            'issue' => [
                'id' => 'jira-external-id',
                'key' => 'JIRA-22',
                'fields' => [
                    'status' => [
                        'name' => 'Done',
                        'statusCategory' => ['key' => 'done'],
                    ],
                    'resolution' => [
                        'name' => 'Fixed',
                    ],
                ],
            ],
        ];

        $this->postJson(route('api.v1.webhooks.jira', [
            'integration' => $integration,
            'secret' => 'jira-secret',
        ]), $payload)->assertNotFound();

        $this->assertSame(BugIssueWorkflowState::Triaged, $issue->fresh()->workflow_state);
        $this->assertSame(BugIssueResolution::Unresolved, $issue->fresh()->resolution);
    }

    private function createIntegration(
        Organization $organization,
        BugIssueExternalProvider $provider,
        bool $enabled,
        string $webhookSecret,
    ): OrganizationIntegration {
        return OrganizationIntegration::query()->create([
            'organization_id' => $organization->id,
            'provider' => $provider->value,
            'is_enabled' => $enabled,
            'webhook_secret' => $webhookSecret,
            'config' => [],
        ]);
    }

    private function createIssue(Organization $organization, string $title): BugIssue
    {
        return BugIssue::query()->create([
            'organization_id' => $organization->id,
            'title' => $title,
            'workflow_state' => BugIssueWorkflowState::Triaged->value,
            'urgency' => BugUrgency::Medium->value,
            'resolution' => BugIssueResolution::Unresolved->value,
        ]);
    }

    private function createExternalLink(
        BugIssue $issue,
        BugIssueExternalProvider $provider,
        string $externalKey,
        string $externalId,
    ): BugIssueExternalLink {
        return BugIssueExternalLink::query()->create([
            'bug_issue_id' => $issue->id,
            'organization_id' => $issue->organization_id,
            'provider' => $provider->value,
            'external_key' => $externalKey,
            'external_id' => $externalId,
            'external_url' => 'https://tracker.example.test/ticket/'.$externalKey,
            'is_primary' => true,
            'sync_mode' => 'bidirectional',
            'last_synced_at' => now(),
        ]);
    }
}
