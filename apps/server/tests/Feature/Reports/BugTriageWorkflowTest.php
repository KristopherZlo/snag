<?php

namespace Tests\Feature\Reports;

use App\Enums\ReportVisibility;
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

    public function test_backlog_page_groups_reports_by_workflow_state(): void
    {
        $user = User::factory()->create();
        $organization = $this->createOrganizationFor($user);
        $user->refresh();

        $todoReport = $this->makeReport($organization->id, [
            'title' => 'Checkout is broken',
            'workflow_state' => 'todo',
            'urgency' => 'critical',
            'triage_tag' => 'unresolved',
        ]);

        $doneReport = $this->makeReport($organization->id, [
            'title' => 'Safari footer overlap',
            'workflow_state' => 'done',
            'urgency' => 'low',
            'triage_tag' => 'fixed',
        ]);

        $this->actingAs($user)
            ->get(route('bugs.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Bugs/Index')
                ->where('sections.todo.0.id', $todoReport->id)
                ->where('sections.todo.0.workflow_state', 'todo')
                ->where('sections.todo.0.urgency', 'critical')
                ->where('sections.todo.0.tag', 'unresolved')
                ->where('sections.done.0.id', $doneReport->id)
                ->where('sections.done.0.workflow_state', 'done')
                ->where('sections.done.0.tag', 'fixed'));
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
