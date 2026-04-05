<?php

namespace App\Services\Reports;

use App\Enums\ArtifactKind;
use App\Models\BugReport;
use App\Models\ReportArtifact;
use Illuminate\Support\Collection;

class ReportArtifactPreviewSelector
{
    public function selectPreviewArtifact(BugReport $report): ?ReportArtifact
    {
        $artifacts = $this->mediaArtifacts($report);

        return $artifacts->first(fn (ReportArtifact $artifact) => $artifact->kind === ArtifactKind::Screenshot && $this->isGeneratedPreview($artifact))
            ?? $artifacts->first(fn (ReportArtifact $artifact) => $artifact->kind === ArtifactKind::Screenshot)
            ?? $artifacts->first(fn (ReportArtifact $artifact) => $artifact->kind === ArtifactKind::Video);
    }

    public function visibleArtifacts(BugReport $report): Collection
    {
        return $report->artifacts
            ->reject(fn (ReportArtifact $artifact) => $this->isGeneratedPreview($artifact))
            ->values();
    }

    public function durationSeconds(BugReport $report, ?ReportArtifact $previewArtifact = null): ?int
    {
        $previewArtifact ??= $this->selectPreviewArtifact($report);

        if (! $previewArtifact) {
            return null;
        }

        if ($previewArtifact->kind === ArtifactKind::Video) {
            return $previewArtifact->duration_seconds;
        }

        if ($this->isGeneratedPreview($previewArtifact)) {
            return $this->videoArtifact($report)?->duration_seconds;
        }

        return $previewArtifact->duration_seconds;
    }

    public function isGeneratedPreview(ReportArtifact $artifact): bool
    {
        return (bool) data_get($artifact->meta, 'generated_preview', false);
    }

    public function generatedPreviewFor(BugReport $report): ?ReportArtifact
    {
        return $report->artifacts->first(
            fn (ReportArtifact $artifact) => $artifact->kind === ArtifactKind::Screenshot && $this->isGeneratedPreview($artifact),
        );
    }

    public function videoArtifact(BugReport $report): ?ReportArtifact
    {
        return $report->artifacts->first(
            fn (ReportArtifact $artifact) => $artifact->kind === ArtifactKind::Video,
        );
    }

    private function mediaArtifacts(BugReport $report): Collection
    {
        return $report->artifacts
            ->filter(fn (ReportArtifact $artifact) => in_array($artifact->kind, [ArtifactKind::Screenshot, ArtifactKind::Video], true))
            ->values();
    }
}
