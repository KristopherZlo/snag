<?php

namespace App\Services\Reports;

use App\Enums\ArtifactKind;
use App\Models\BugReport;
use App\Models\ReportArtifact;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;
use Throwable;

class VideoPreviewGenerator
{
    public function __construct(
        private readonly ReportArtifactPreviewSelector $previews,
        private readonly ReportArtifactPlaceholderGenerator $placeholders,
    ) {}

    public function generateForReport(BugReport $report): ?ReportArtifact
    {
        $report->loadMissing('artifacts');

        if ($report->media_kind !== 'video') {
            return null;
        }

        $videoArtifact = $this->previews->videoArtifact($report);

        if (! $videoArtifact) {
            return null;
        }

        $existingPreview = $this->previews->generatedPreviewFor($report);

        if ($existingPreview && Storage::disk($existingPreview->disk)->exists($existingPreview->path)) {
            return $existingPreview;
        }

        $ffmpeg = $this->resolveFfmpegBinary();

        if (! $ffmpeg) {
            return null;
        }

        $disk = Storage::disk($videoArtifact->disk);

        if (! $disk->exists($videoArtifact->path)) {
            return null;
        }

        $tempDirectory = storage_path('app/tmp/video-previews/'.Str::uuid());
        File::ensureDirectoryExists($tempDirectory);

        try {
            $inputPath = $this->resolveInputPath($videoArtifact, $tempDirectory);
            $outputPath = $tempDirectory.DIRECTORY_SEPARATOR.'preview.jpg';
            $process = new Process([
                $ffmpeg,
                '-hide_banner',
                '-loglevel',
                'error',
                '-y',
                '-ss',
                $this->frameOffsetSeconds($videoArtifact),
                '-i',
                $inputPath,
                '-frames:v',
                '1',
                '-an',
                '-vf',
                'scale=1280:-2:force_original_aspect_ratio=decrease',
                '-q:v',
                '4',
                $outputPath,
            ]);
            $process->setTimeout(20);
            $process->run();

            if (! $process->isSuccessful() || ! is_file($outputPath) || filesize($outputPath) <= 0) {
                return null;
            }

            $binary = File::get($outputPath);

            if ($binary === false || $binary === '') {
                return null;
            }

            $previewPath = $this->previewPathFor($videoArtifact);
            $disk->put($previewPath, $binary);

            $meta = [
                'generated_preview' => true,
                'source_artifact_id' => $videoArtifact->id,
                'source_checksum' => $videoArtifact->checksum,
            ];
            $placeholder = $this->placeholders->placeholderForBinary($binary);

            if ($placeholder) {
                $meta['placeholder'] = $placeholder;
            }

            $payload = [
                'organization_id' => $report->organization_id,
                'bug_report_id' => $report->id,
                'kind' => ArtifactKind::Screenshot->value,
                'disk' => $videoArtifact->disk,
                'path' => $previewPath,
                'content_type' => 'image/jpeg',
                'byte_size' => strlen($binary),
                'duration_seconds' => null,
                'checksum' => hash('sha256', $binary),
                'meta' => $meta,
            ];

            if ($existingPreview) {
                $existingPreview->forceFill($payload)->save();

                return $existingPreview->fresh();
            }

            return ReportArtifact::query()->create($payload);
        } catch (Throwable) {
            return null;
        } finally {
            File::deleteDirectory($tempDirectory);
        }
    }

    private function resolveFfmpegBinary(): ?string
    {
        $finder = new ExecutableFinder;

        return $finder->find('ffmpeg') ?: $finder->find('ffmpeg.exe');
    }

    private function resolveInputPath(ReportArtifact $videoArtifact, string $tempDirectory): string
    {
        $disk = Storage::disk($videoArtifact->disk);

        try {
            $resolvedPath = $disk->path($videoArtifact->path);

            if (is_string($resolvedPath) && is_file($resolvedPath)) {
                return $resolvedPath;
            }
        } catch (Throwable) {
            // Fall back to a temporary local copy for non-local disks.
        }

        $extension = pathinfo($videoArtifact->path, PATHINFO_EXTENSION) ?: 'webm';
        $temporaryInput = $tempDirectory.DIRECTORY_SEPARATOR.'source.'.$extension;
        File::put($temporaryInput, $disk->get($videoArtifact->path));

        return $temporaryInput;
    }

    private function previewPathFor(ReportArtifact $videoArtifact): string
    {
        return dirname($videoArtifact->path).'/video-preview.jpg';
    }

    private function frameOffsetSeconds(ReportArtifact $videoArtifact): string
    {
        $duration = (float) ($videoArtifact->duration_seconds ?? 0);
        $offset = $duration > 0
            ? min(max($duration * 0.15, 0.35), 2.5)
            : 0.8;

        return number_format($offset, 3, '.', '');
    }
}
