<?php

namespace Tests\Feature\Reports;

use App\Enums\ReportVisibility;
use App\Models\BugIssue;
use App\Models\BugReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class BugTriageWorkflowTest extends TestCase
{
    use CreatesOrganizations;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_authenticated_member_can_update_bug_triage_fields(): void
    {
        $user = User::factory()->create();
        $organization = $this->createOrganizationFor($user);
        $report = $this->makeReport($organization->id);
        $user->refresh();

        Sanctum::actingAs($user);

        $this->patchJson(route('api.v1.reports.triage', $report), [
            'workflow_state' => 'done',
            'urgency' => 'critical',
            'tag' => 'blocked',
        ])->assertOk()->assertJson([
            'workflow_state' => 'done',
            'urgency' => 'critical',
            'tag' => 'blocked',
        ]);

        $report->refresh();

        $this->assertSame('done', $report->workflow_state->value);
        $this->assertSame('critical', $report->urgency->value);
        $this->assertSame('blocked', $report->triage_tag->value);
    }

    public function test_backlog_page_returns_issue_centric_payload(): void
    {
        $user = User::factory()->create();
        $organization = $this->createOrganizationFor($user);
        $user->refresh();

        $inboxIssue = BugIssue::query()->create([
            'organization_id' => $organization->id,
            'creator_id' => $user->id,
            'title' => 'Checkout is broken',
            'summary' => 'Created from the issue workspace.',
            'workflow_state' => 'inbox',
            'urgency' => 'critical',
            'resolution' => 'unresolved',
            'labels' => ['checkout'],
            'meta' => [],
            'first_seen_at' => now()->subHour(),
            'last_seen_at' => now(),
        ]);

        $doneIssue = BugIssue::query()->create([
            'organization_id' => $organization->id,
            'creator_id' => $user->id,
            'title' => 'Safari footer overlap',
            'summary' => 'Already fixed.',
            'workflow_state' => 'done',
            'urgency' => 'low',
            'resolution' => 'fixed',
            'labels' => ['safari'],
            'meta' => [],
            'first_seen_at' => now()->subDays(2),
            'last_seen_at' => now()->subDay(),
        ]);

        $this->actingAs($user)
            ->get(route('bugs.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Bugs/Index')
                ->where('issues.0.id', $inboxIssue->id)
                ->where('issues.0.workflow_state', 'inbox')
                ->where('issues.0.urgency', 'critical')
                ->where('issues.0.resolution', 'unresolved')
                ->where('issues.1.id', $doneIssue->id)
                ->where('issues.1.workflow_state', 'done')
                ->where('issues.1.resolution', 'fixed')
                ->where('summary.inbox', 1)
                ->where('summary.done', 1));
    }

    public function test_authenticated_member_can_create_attach_and_share_issue(): void
    {
        $user = User::factory()->create();
        $organization = $this->createOrganizationFor($user);
        $report = $this->makeReport($organization->id, [
            'title' => 'Original checkout report',
        ]);
        $secondReport = $this->makeReport($organization->id, [
            'title' => 'Second duplicate report',
        ]);
        $user->refresh();

        Sanctum::actingAs($user);

        $issueResponse = $this->postJson(route('api.v1.reports.issue', $report), [
            'title' => 'Checkout issue',
            'summary' => 'Created from a raw report.',
        ])->assertCreated();

        $issueId = $issueResponse->json('issue.id');

        $this->postJson(route('api.v1.issues.reports.store', $issueId), [
            'report_id' => $secondReport->id,
            'is_primary' => false,
        ])->assertCreated();

        $shareResponse = $this->postJson(route('api.v1.issues.share-links.store', $issueId), [
            'name' => 'QA handoff',
        ])->assertCreated();

        $issue = BugIssue::query()->findOrFail($issueId);

        $this->assertSame('Checkout issue', $issue->title);
        $this->assertSame(2, $issue->reports()->count());
        $this->assertNotNull($shareResponse->json('issue.share_tokens.0.url'));
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeReport(int $organizationId, array $overrides = []): BugReport
    {
        return BugReport::query()->create(array_merge([
            'organization_id' => $organizationId,
            'title' => 'Captured bug report',
            'summary' => 'Created by feature test.',
            'media_kind' => 'screenshot',
            'status' => 'ready',
            'workflow_state' => 'todo',
            'urgency' => 'medium',
            'triage_tag' => 'unresolved',
            'visibility' => ReportVisibility::Organization->value,
            'share_token' => Str::lower(Str::random(32)),
            'meta' => [],
        ], $overrides));
    }
}
