<?php

namespace App\Http\Controllers\Web;

use App\Enums\BugReportStatus;
use App\Http\Controllers\Controller;
use App\Models\BugReport;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class BugBoardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');
        $search = $request->string('search')->toString();

        $reports = BugReport::query()
            ->with('artifacts')
            ->where('organization_id', $organization->id)
            ->where('status', '!=', BugReportStatus::Deleted->value)
            ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $searchQuery) use ($search) {
                $searchQuery
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('summary', 'like', "%{$search}%");
            }))
            ->orderByRaw($this->urgencyOrderSql().' desc')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (BugReport $report) => $this->transformReport($report));

        $todoReports = $reports->where('workflow_state', 'todo')->values();
        $doneReports = $reports->where('workflow_state', 'done')->values();

        return Inertia::render('Bugs/Index', [
            'filters' => [
                'search' => $search,
            ],
            'sections' => [
                'todo' => $todoReports,
                'done' => $doneReports,
            ],
            'summary' => [
                'total' => $reports->count(),
                'todo' => $todoReports->count(),
                'done' => $doneReports->count(),
                'critical' => $reports->where('urgency', 'critical')->count(),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transformReport(BugReport $report): array
    {
        $previewArtifact = $report->artifacts->first(
            fn ($artifact) => in_array($artifact->kind->value, ['screenshot', 'video'], true),
        );

        return [
            'id' => $report->id,
            'title' => $report->title,
            'summary' => $report->summary,
            'status' => $report->status->value,
            'workflow_state' => $report->workflow_state->value,
            'urgency' => $report->urgency->value,
            'tag' => $report->triage_tag->value,
            'visibility' => $report->visibility->value,
            'media_kind' => $report->media_kind,
            'created_at' => $report->created_at?->toIso8601String(),
            'share_url' => $report->publicShareUrl(),
            'preview' => $previewArtifact
                ? [
                    'kind' => $previewArtifact->kind->value,
                    'content_type' => $previewArtifact->content_type,
                    'url' => $this->temporaryUrl($previewArtifact->path),
                ]
                : null,
        ];
    }

    private function urgencyOrderSql(): string
    {
        return <<<'SQL'
            case urgency
                when 'critical' then 4
                when 'high' then 3
                when 'medium' then 2
                when 'low' then 1
                else 0
            end
        SQL;
    }

    private function temporaryUrl(string $path): ?string
    {
        $disk = Storage::disk(config('snag.storage.artifact_disk'));

        return method_exists($disk, 'temporaryUrl')
            ? $disk->temporaryUrl($path, now()->addMinutes((int) config('snag.capture.share_url_ttl_minutes')))
            : null;
    }
}
