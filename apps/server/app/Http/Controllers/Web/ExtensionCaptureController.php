<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Jobs\CleanupArtifactsJob;
use App\Models\BugReport;
use App\Models\Organization;
use App\Services\Reports\ReportArtifactMediaPayloadFactory;
use App\Services\Reports\ReportArtifactPreviewSelector;
use App\Services\Reports\VideoPreviewGenerator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExtensionCaptureController extends Controller
{
    public function index(
        Request $request,
        ReportArtifactPreviewSelector $previews,
        ReportArtifactMediaPayloadFactory $mediaPayloads,
        VideoPreviewGenerator $videoPreviews,
    ): Response
    {
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');

        $captures = BugReport::query()
            ->with('artifacts')
            ->where('organization_id', $organization->id)
            ->where('reporter_id', $request->user()->id)
            ->latest()
            ->get()
            ->map(function (BugReport $report) use ($previews, $mediaPayloads, $videoPreviews) {
                if ($report->media_kind === 'video' && ! $previews->generatedPreviewFor($report)) {
                    $videoPreviews->generateForReport($report);
                    $report->load('artifacts');
                }

                return [
                    'id' => $report->id,
                    'title' => $report->title,
                    'summary' => $report->summary,
                    'status' => $report->status->value,
                    'visibility' => $report->visibility->value,
                    'media_kind' => $report->media_kind,
                    'created_at' => $report->created_at?->toIso8601String(),
                    'report_url' => route('reports.show', $report),
                    'share_url' => null,
                    'has_public_share' => $report->hasPublicShare(),
                    'page_url' => $report->meta['debugger']['context']['url'] ?? null,
                    'preview' => $mediaPayloads->preview($report),
                ];
            })
            ->values();

        return Inertia::render('Extension/Captures', [
            'captures' => $captures,
            'stats' => [
                'total' => $captures->count(),
                'screenshots' => $captures->where('media_kind', 'screenshot')->count(),
                'videos' => $captures->where('media_kind', 'video')->count(),
            ],
        ]);
    }

    public function destroy(Request $request, BugReport $bugReport): RedirectResponse
    {
        $this->authorize('delete', $bugReport);

        $bugReport->delete();
        CleanupArtifactsJob::dispatch($bugReport->id);

        return redirect()
            ->route('settings.extension.captures')
            ->with('status', 'Capture deleted from the server.');
    }
}
