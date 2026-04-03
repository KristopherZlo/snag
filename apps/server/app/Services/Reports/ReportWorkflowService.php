<?php

namespace App\Services\Reports;

use App\Enums\ArtifactKind;
use App\Enums\BugReportStatus;
use App\Enums\ReportVisibility;
use App\Events\ReportStatusUpdated;
use App\Jobs\IngestDebuggerArtifactJob;
use App\Models\BugReport;
use App\Models\CaptureKey;
use App\Models\Organization;
use App\Models\ReportArtifact;
use App\Models\UploadSession;
use App\Models\User;
use App\Services\Billing\EntitlementService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class ReportWorkflowService
{
    public function __construct(
        private readonly EntitlementService $entitlements,
        private readonly PublicCaptureArtifactValidator $publicCaptureArtifacts,
    ) {}

    public function createAuthenticatedSession(User $user, Organization $organization, array $data): array
    {
        return $this->createSession($organization, $user, null, $data, 'authenticated');
    }

    public function createPublicSession(CaptureKey $captureKey, array $data): array
    {
        return $this->createSession($captureKey->organization, null, $captureKey, $data, 'public');
    }

    public function finalize(UploadSession $session, array $data): BugReport
    {
        if ($session->consumed_at || $session->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'upload_session_token' => 'upload_session_expired',
            ]);
        }

        $this->entitlements->assertMediaAllowed(
            $session->organization,
            $session->media_kind,
            $data['media_duration_seconds'] ?? null
        );

        $disk = Storage::disk(config('snag.storage.artifact_disk'));
        $artifacts = $session->artifacts ?? [];
        $validatedArtifacts = [];

        if ($session->mode === 'public') {
            $validatedArtifacts = $this->publicCaptureArtifacts->validate($session);
        } else {
            foreach ($artifacts as $artifact) {
                if (! $disk->exists($artifact['key'])) {
                    throw ValidationException::withMessages([
                        'upload_session_token' => 'artifact_mismatch',
                    ]);
                }
            }
        }

        return DB::transaction(function () use ($session, $data, $disk, $artifacts, $validatedArtifacts): BugReport {
            $status = collect($artifacts)->contains(fn (array $artifact) => $artifact['kind'] === ArtifactKind::Debugger->value)
                ? BugReportStatus::Processing
                : BugReportStatus::Ready;
            $shareToken = Str::lower(Str::random(32));

            $report = BugReport::query()->create([
                'organization_id' => $session->organization_id,
                'upload_session_id' => $session->id,
                'capture_key_id' => $session->capture_key_id,
                'reporter_id' => $session->user_id,
                'title' => $data['title'] ?? Str::headline($session->media_kind).' report',
                'summary' => $data['summary'] ?? null,
                'media_kind' => $session->media_kind,
                'status' => $status,
                'visibility' => ReportVisibility::from($data['visibility'] ?? ReportVisibility::Organization->value),
                'share_token' => $shareToken,
                'meta' => [
                    'session_meta' => $session->meta,
                    'client_meta' => $data['meta'] ?? [],
                ],
                'ready_at' => $status === BugReportStatus::Ready ? now() : null,
            ]);

            foreach ($artifacts as $artifact) {
                $validatedArtifact = $validatedArtifacts[$artifact['key']] ?? null;

                ReportArtifact::query()->create([
                    'organization_id' => $session->organization_id,
                    'bug_report_id' => $report->id,
                    'kind' => $artifact['kind'],
                    'disk' => config('snag.storage.artifact_disk'),
                    'path' => $artifact['key'],
                    'content_type' => $validatedArtifact['content_type'] ?? $artifact['content_type'],
                    'byte_size' => $validatedArtifact['byte_size'] ?? ($disk->size($artifact['key']) ?: 0),
                    'duration_seconds' => $artifact['kind'] === ArtifactKind::Video->value ? ($data['media_duration_seconds'] ?? null) : null,
                    'checksum' => $validatedArtifact['checksum'] ?? null,
                    'meta' => $validatedArtifact['meta'] ?? [],
                ]);
            }

            $session->forceFill([
                'status' => 'finalized',
                'consumed_at' => now(),
            ])->save();

            if ($status === BugReportStatus::Processing) {
                IngestDebuggerArtifactJob::dispatch($report->id);
            } else {
                event(new ReportStatusUpdated($report));
            }

            $report = $report->load('artifacts');
            $report->rememberPublicShareToken($shareToken);

            return $report;
        });
    }

    private function createSession(
        Organization $organization,
        ?User $user,
        ?CaptureKey $captureKey,
        array $data,
        string $mode
    ): array {
        $this->entitlements->assertMediaAllowed($organization, $data['media_kind']);

        $disk = Storage::disk(config('snag.storage.artifact_disk'));

        if (! method_exists($disk, 'temporaryUploadUrl')) {
            throw new RuntimeException('Configured disk does not support temporary upload URLs.');
        }

        $sessionToken = Str::lower(Str::random(32));
        $artifacts = $this->buildArtifacts($organization, $sessionToken, $data['media_kind']);

        $session = UploadSession::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $user?->id,
            'capture_key_id' => $captureKey?->id,
            'token' => $sessionToken,
            'finalize_token' => Str::lower(Str::random(48)),
            'mode' => $mode,
            'media_kind' => $data['media_kind'],
            'status' => 'pending',
            'allowed_origin' => $data['origin'] ?? null,
            'artifacts' => $artifacts,
            'meta' => $data['meta'] ?? [],
            'expires_at' => now()->addMinutes((int) config('snag.capture.upload_session_ttl_minutes')),
        ]);

        return [
            'upload_session_token' => $session->token,
            'finalize_token' => $session->finalize_token,
            'expires_at' => $session->expires_at->toIso8601String(),
            'artifacts' => collect($artifacts)->map(function (array $artifact) use ($disk) {
                $signed = $disk->temporaryUploadUrl(
                    $artifact['key'],
                    now()->addMinutes((int) config('snag.capture.upload_session_ttl_minutes')),
                    ['ContentType' => $artifact['content_type']]
                );

                return [
                    'kind' => $artifact['kind'],
                    'key' => $artifact['key'],
                    'content_type' => $artifact['content_type'],
                    'upload' => [
                        'method' => 'PUT',
                        'url' => $signed['url'],
                        'headers' => $signed['headers'] ?? [],
                    ],
                ];
            })->values()->all(),
        ];
    }

    private function buildArtifacts(Organization $organization, string $sessionToken, string $mediaKind): array
    {
        $basePath = "org/{$organization->id}/uploads/{$sessionToken}";

        return array_values(array_filter([
            $mediaKind === 'screenshot' ? [
                'kind' => ArtifactKind::Screenshot->value,
                'key' => "{$basePath}/capture.png",
                'content_type' => 'image/png',
            ] : null,
            $mediaKind === 'video' ? [
                'kind' => ArtifactKind::Video->value,
                'key' => "{$basePath}/capture.webm",
                'content_type' => 'video/webm',
            ] : null,
            [
                'kind' => ArtifactKind::Debugger->value,
                'key' => "{$basePath}/debugger.json",
                'content_type' => 'application/json',
            ],
        ]));
    }
}
