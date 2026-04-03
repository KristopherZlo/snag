<?php

namespace Tests\Feature\Reports;

use App\Enums\ArtifactKind;
use App\Enums\BugReportStatus;
use App\Enums\OrganizationRole;
use App\Enums\ReportVisibility;
use App\Models\BugReport;
use App\Models\ReportArtifact;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class ExtensionCaptureManagementTest extends TestCase
{
    use CreatesOrganizations;
    use RefreshDatabase;

    public function test_sent_captures_page_lists_only_reports_created_by_the_current_user(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganizationFor($owner);
        $member = User::factory()->create();

        $this->addMembership($organization, $member, OrganizationRole::Member, $owner);
        $member->forceFill(['active_organization_id' => $organization->id])->save();

        $ownCapture = $this->createCapture($organization->id, $member->id, 'Own screenshot', 'screenshot');
        $this->createCapture($organization->id, $owner->id, 'Owner video', 'video');

        $this->actingAs($member)
            ->get(route('settings.extension.captures'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Extension/Captures')
                ->has('captures', 1)
                ->where('captures.0.id', $ownCapture->id)
                ->where('captures.0.title', 'Own screenshot')
                ->where('stats.total', 1)
                ->where('stats.screenshots', 1)
                ->where('stats.videos', 0));
    }

    public function test_reporter_can_delete_their_own_capture_from_the_server(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganizationFor($owner);
        $member = User::factory()->create();

        $this->addMembership($organization, $member, OrganizationRole::Member, $owner);
        $member->forceFill(['active_organization_id' => $organization->id])->save();

        $capture = $this->createCapture($organization->id, $member->id, 'Sensitive recording', 'video');

        $this->actingAs($member)
            ->delete(route('settings.extension.captures.destroy', $capture))
            ->assertRedirect(route('settings.extension.captures'));

        $this->assertSoftDeleted('bug_reports', [
            'id' => $capture->id,
        ]);
    }

    public function test_member_cannot_delete_someone_elses_capture(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganizationFor($owner);
        $member = User::factory()->create();

        $this->addMembership($organization, $member, OrganizationRole::Member, $owner);
        $member->forceFill(['active_organization_id' => $organization->id])->save();

        $capture = $this->createCapture($organization->id, $owner->id, 'Owner-only recording', 'video');

        $this->actingAs($member)
            ->delete(route('settings.extension.captures.destroy', $capture))
            ->assertForbidden();

        $this->assertDatabaseHas('bug_reports', [
            'id' => $capture->id,
            'deleted_at' => null,
        ]);
    }

    private function createCapture(int $organizationId, int $reporterId, string $title, string $mediaKind): BugReport
    {
        $report = BugReport::query()->create([
            'organization_id' => $organizationId,
            'reporter_id' => $reporterId,
            'title' => $title,
            'summary' => 'Captured from the extension.',
            'media_kind' => $mediaKind,
            'status' => BugReportStatus::Ready->value,
            'visibility' => ReportVisibility::Organization->value,
            'share_token' => Str::lower(Str::random(24)),
            'meta' => [
                'debugger' => [
                    'context' => [
                        'url' => 'https://app.example.test/checkout',
                    ],
                ],
            ],
            'ready_at' => now(),
        ]);

        ReportArtifact::query()->create([
            'organization_id' => $organizationId,
            'bug_report_id' => $report->id,
            'kind' => $mediaKind === 'video' ? ArtifactKind::Video->value : ArtifactKind::Screenshot->value,
            'disk' => 'local',
            'path' => "org/{$organizationId}/uploads/".Str::lower(Str::random(12))."/capture.".($mediaKind === 'video' ? 'webm' : 'png'),
            'content_type' => $mediaKind === 'video' ? 'video/webm' : 'image/png',
            'byte_size' => 2048,
            'duration_seconds' => $mediaKind === 'video' ? 18 : null,
        ]);

        return $report->fresh();
    }
}
