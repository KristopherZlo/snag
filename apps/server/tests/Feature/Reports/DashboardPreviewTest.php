<?php

namespace Tests\Feature\Reports;

use App\Enums\ArtifactKind;
use App\Models\BugReport;
use App\Models\ReportArtifact;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class DashboardPreviewTest extends TestCase
{
    use CreatesOrganizations;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::disk('local')->deleteDirectory('org');
        File::deleteDirectory(storage_path('app/dashboard-previews'));
    }

    protected function tearDown(): void
    {
        Storage::disk('local')->deleteDirectory('org');
        File::deleteDirectory(storage_path('app/dashboard-previews'));

        parent::tearDown();
    }

    public function test_dashboard_payload_uses_a_dedicated_preview_route_for_media_cards(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $organization = $this->createOrganizationFor($user);
        $report = $this->createReport($organization, 'screenshot');
        $artifact = $this->createArtifact($report, ArtifactKind::Screenshot, 'org/'.$organization->id.'/uploads/dashboard-preview/capture.png');

        $this->putPng($artifact->path, 1600, 900);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('reports.data.0.preview.id', $artifact->id)
                ->where('reports.data.0.preview.dashboard_url', route('dashboard.previews.show', $artifact))
                ->where('reports.data.0.preview.placeholder.average_color', fn ($value) => is_string($value) && str_starts_with($value, '#'))
                ->where('reports.data.0.preview.placeholder.blur_data_url', fn ($value) => is_string($value) && str_starts_with($value, 'data:image/')));
    }

    public function test_dashboard_payload_keeps_video_cards_lightweight_without_a_server_thumbnail_route(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $organization = $this->createOrganizationFor($user);
        $report = $this->createReport($organization, 'video');
        $artifact = $this->createArtifact(
            $report,
            ArtifactKind::Video,
            'org/'.$organization->id.'/uploads/dashboard-preview/capture.webm',
            durationSeconds: 42,
        );

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('reports.data.0.preview.id', $artifact->id)
                ->where('reports.data.0.preview.dashboard_url', null)
                ->where('reports.data.0.preview.duration_seconds', 42));
    }

    public function test_dashboard_payload_prefers_a_generated_screenshot_preview_for_video_reports(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $organization = $this->createOrganizationFor($user);
        $report = $this->createReport($organization, 'video');
        $videoArtifact = $this->createArtifact(
            $report,
            ArtifactKind::Video,
            'org/'.$organization->id.'/uploads/dashboard-preview/capture.webm',
            durationSeconds: 42,
        );
        $previewArtifact = ReportArtifact::query()->create([
            'organization_id' => $report->organization_id,
            'bug_report_id' => $report->id,
            'kind' => ArtifactKind::Screenshot->value,
            'disk' => 'local',
            'path' => 'org/'.$organization->id.'/uploads/dashboard-preview/video-preview.jpg',
            'content_type' => 'image/jpeg',
            'byte_size' => 1,
            'duration_seconds' => null,
            'checksum' => 'generated-preview-checksum',
            'meta' => [
                'generated_preview' => true,
                'source_artifact_id' => $videoArtifact->id,
            ],
        ]);

        $this->putPng($previewArtifact->path, 1280, 720);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('reports.data.0.preview.id', $previewArtifact->id)
                ->where('reports.data.0.preview.kind', 'screenshot')
                ->where('reports.data.0.preview.dashboard_url', route('dashboard.previews.show', $previewArtifact))
                ->where('reports.data.0.preview.duration_seconds', 42));
    }

    public function test_dashboard_preview_route_resizes_screenshot_artifacts_for_smaller_cards(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $organization = $this->createOrganizationFor($user);
        $report = $this->createReport($organization, 'screenshot');
        $artifact = $this->createArtifact($report, ArtifactKind::Screenshot, 'org/'.$organization->id.'/uploads/dashboard-preview/capture.png');

        $this->putPng($artifact->path, 1600, 900);

        $response = $this->actingAs($user)->get(route('dashboard.previews.show', [
            'reportArtifact' => $artifact,
            'w' => 350,
        ]));

        $response->assertOk();
        $this->assertInstanceOf(BinaryFileResponse::class, $response->baseResponse);

        $contents = file_get_contents($response->baseResponse->getFile()->getPathname());
        $dimensions = getimagesizefromstring($contents ?: '');

        $this->assertIsArray($dimensions);
        $this->assertSame(384, $dimensions[0]);
        $this->assertSame(216, $dimensions[1]);
    }

    public function test_dashboard_preview_route_forbids_artifacts_from_other_organizations(): void
    {
        $owner = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $otherMember = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $organization = $this->createOrganizationFor($owner, name: 'Acme QA');
        $otherOrganization = $this->createOrganizationFor($otherMember, name: 'Other QA');
        $report = $this->createReport($organization, 'screenshot');
        $artifact = $this->createArtifact($report, ArtifactKind::Screenshot, 'org/'.$organization->id.'/uploads/dashboard-preview/capture.png');

        $this->putPng($artifact->path, 1200, 675);

        $this->actingAs($otherMember)
            ->get(route('dashboard.previews.show', $artifact))
            ->assertForbidden();
    }

    private function createReport(\App\Models\Organization $organization, string $mediaKind): BugReport
    {
        return BugReport::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Dashboard preview report',
            'summary' => 'Preview coverage for dashboard cards.',
            'media_kind' => $mediaKind,
            'status' => 'ready',
            'workflow_state' => 'todo',
            'urgency' => 'medium',
            'triage_tag' => 'unresolved',
            'visibility' => 'organization',
            'share_token' => null,
            'ready_at' => now(),
        ]);
    }

    private function createArtifact(
        BugReport $report,
        ArtifactKind $kind,
        string $path,
        ?int $durationSeconds = null,
    ): ReportArtifact {
        return ReportArtifact::query()->create([
            'organization_id' => $report->organization_id,
            'bug_report_id' => $report->id,
            'kind' => $kind->value,
            'disk' => 'local',
            'path' => $path,
            'content_type' => $kind === ArtifactKind::Screenshot ? 'image/png' : 'video/webm',
            'byte_size' => 1,
            'duration_seconds' => $durationSeconds,
            'checksum' => 'dashboard-preview-checksum',
            'meta' => [],
        ]);
    }

    private function putPng(string $path, int $width, int $height): void
    {
        $image = imagecreatetruecolor($width, $height);
        $background = imagecolorallocate($image, 245, 245, 245);
        $accent = imagecolorallocate($image, 217, 119, 6);

        imagefill($image, 0, 0, $background);
        imagefilledrectangle($image, 48, 48, $width - 48, 168, $accent);

        ob_start();
        imagepng($image);
        $binary = ob_get_clean();
        imagedestroy($image);

        Storage::disk('local')->put($path, $binary ?: '');
    }
}
