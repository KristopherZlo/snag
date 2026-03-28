<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\BugReport;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ShareController extends Controller
{
    public function show(string $shareToken): Response
    {
        $bugReport = BugReport::query()
            ->where('share_token', $shareToken)
            ->where('visibility', 'public')
            ->where('status', 'ready')
            ->with(['artifacts', 'debuggerActions', 'debuggerLogs', 'debuggerNetworkRequests'])
            ->firstOrFail();

        return Inertia::render('Reports/Share', [
            'report' => [
                'title' => $bugReport->title,
                'summary' => $bugReport->summary,
                'media_kind' => $bugReport->media_kind,
                'artifacts' => $bugReport->artifacts->map(fn ($artifact) => [
                    'kind' => $artifact->kind->value,
                    'content_type' => $artifact->content_type,
                    'url' => $this->temporaryUrl($artifact->path),
                ])->values(),
                'debugger' => [
                    'actions' => $bugReport->debuggerActions->map->only(['sequence', 'type', 'label', 'selector', 'value']),
                    'logs' => $bugReport->debuggerLogs->map->only(['sequence', 'level', 'message']),
                    'network_requests' => $bugReport->debuggerNetworkRequests->map->only(['sequence', 'method', 'url', 'status_code', 'duration_ms']),
                ],
            ],
        ]);
    }

    private function temporaryUrl(string $path): ?string
    {
        $disk = Storage::disk(config('snag.storage.artifact_disk'));

        return method_exists($disk, 'temporaryUrl')
            ? $disk->temporaryUrl($path, now()->addMinutes((int) config('snag.capture.share_url_ttl_minutes')))
            : null;
    }
}
