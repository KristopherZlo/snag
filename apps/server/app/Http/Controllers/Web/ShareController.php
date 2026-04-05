<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\BugReport;
use App\Services\Reports\ReportArtifactMediaPayloadFactory;
use App\Services\Reports\ReportArtifactPreviewSelector;
use App\Services\Reports\VideoPreviewGenerator;
use App\Support\ShareUrlSummary;
use Inertia\Inertia;
use Inertia\Response;

class ShareController extends Controller
{
    public function show(
        string $shareToken,
        ReportArtifactPreviewSelector $previews,
        ReportArtifactMediaPayloadFactory $mediaPayloads,
        VideoPreviewGenerator $videoPreviews,
    ): Response
    {
        $bugReport = BugReport::query()
            ->forShareToken($shareToken)
            ->where('visibility', 'public')
            ->where('status', 'ready')
            ->with(['artifacts', 'debuggerActions', 'debuggerLogs', 'debuggerNetworkRequests'])
            ->firstOrFail();
        if ($bugReport->media_kind === 'video' && ! $previews->generatedPreviewFor($bugReport)) {
            $videoPreviews->generateForReport($bugReport);
            $bugReport->load('artifacts');
        }
        $visibleArtifacts = $previews->visibleArtifacts($bugReport);
        $generatedPreview = $mediaPayloads->videoPoster($bugReport);

        return Inertia::render('Reports/Share', [
            'report' => [
                'title' => $bugReport->title,
                'summary' => $bugReport->summary,
                'media_kind' => $bugReport->media_kind,
                'video_poster' => $generatedPreview,
                'video_poster_url' => $generatedPreview['url'] ?? null,
                'artifacts' => $visibleArtifacts->map(fn ($artifact) => $mediaPayloads->artifact($artifact))->values(),
                'debugger' => [
                    'actions' => $bugReport->debuggerActions->map(fn ($action) => [
                        'sequence' => $action->sequence,
                        'type' => $action->type,
                        'label' => $action->label,
                        'selector' => null,
                    ])->values(),
                    'logs' => [],
                    'network_requests' => $bugReport->debuggerNetworkRequests->map(fn ($request) => [
                        'sequence' => $request->sequence,
                        'method' => $request->method,
                        'url' => ShareUrlSummary::summarize($request->url),
                        'status_code' => $request->status_code,
                        'duration_ms' => $request->duration_ms,
                    ])->values(),
                ],
            ],
        ]);
    }
}
