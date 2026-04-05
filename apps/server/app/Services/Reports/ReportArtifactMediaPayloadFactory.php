<?php

namespace App\Services\Reports;

use App\Enums\ArtifactKind;
use App\Models\BugReport;
use App\Models\ReportArtifact;
use Illuminate\Support\Facades\Storage;

class ReportArtifactMediaPayloadFactory
{
    public function __construct(
        private readonly ReportArtifactPreviewSelector $previews,
        private readonly ReportArtifactPlaceholderGenerator $placeholders,
    ) {}

    /**
     * @return array{id:int, kind:string, content_type:?string, duration_seconds:?int, url:?string, dashboard_url:?string, placeholder:?array{average_color:string, blur_data_url:string, width:int|null, height:int|null}}|null
     */
    public function preview(BugReport $report, bool $includeDashboardUrl = false): ?array
    {
        $previewArtifact = $this->previews->selectPreviewArtifact($report);

        if (! $previewArtifact) {
            return null;
        }

        return [
            'id' => $previewArtifact->id,
            'kind' => $previewArtifact->kind->value,
            'content_type' => $previewArtifact->content_type,
            'duration_seconds' => $this->previews->durationSeconds($report, $previewArtifact),
            'url' => $this->temporaryUrl($previewArtifact),
            'dashboard_url' => $includeDashboardUrl && $previewArtifact->kind === ArtifactKind::Screenshot
                ? route('dashboard.previews.show', $previewArtifact)
                : null,
            'placeholder' => $this->placeholders->ensureForArtifact($previewArtifact),
        ];
    }

    /**
     * @return array{id:int, kind:string, content_type:?string, url:?string, placeholder:?array{average_color:string, blur_data_url:string, width:int|null, height:int|null}}
     */
    public function artifact(ReportArtifact $artifact): array
    {
        return [
            'id' => $artifact->id,
            'kind' => $artifact->kind->value,
            'content_type' => $artifact->content_type,
            'url' => $this->temporaryUrl($artifact),
            'placeholder' => $this->placeholders->ensureForArtifact($artifact),
        ];
    }

    /**
     * @return array{id:int, kind:string, content_type:?string, url:?string, placeholder:?array{average_color:string, blur_data_url:string, width:int|null, height:int|null}}|null
     */
    public function videoPoster(BugReport $report): ?array
    {
        $posterArtifact = $this->previews->generatedPreviewFor($report);

        return $posterArtifact ? $this->artifact($posterArtifact) : null;
    }

    private function temporaryUrl(ReportArtifact $artifact): ?string
    {
        $disk = Storage::disk($artifact->disk);

        return method_exists($disk, 'temporaryUrl')
            ? $disk->temporaryUrl($artifact->path, now()->addMinutes((int) config('snag.capture.share_url_ttl_minutes')))
            : null;
    }
}
