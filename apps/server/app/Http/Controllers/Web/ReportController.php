<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\BugReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function show(Request $request, BugReport $bugReport): Response
    {
        $this->authorize('view', $bugReport);

        $bugReport->load(['artifacts', 'debuggerActions', 'debuggerLogs', 'debuggerNetworkRequests', 'organization', 'reporter']);

        return Inertia::render('Reports/Show', [
            'report' => [
                'id' => $bugReport->id,
                'title' => $bugReport->title,
                'summary' => $bugReport->summary,
                'status' => $bugReport->status->value,
                'workflow_state' => $bugReport->workflow_state->value,
                'urgency' => $bugReport->urgency->value,
                'tag' => $bugReport->triage_tag->value,
                'visibility' => $bugReport->visibility->value,
                'media_kind' => $bugReport->media_kind,
                'organization' => [
                    'name' => $bugReport->organization->name,
                    'slug' => $bugReport->organization->slug,
                ],
                'reporter' => [
                    'name' => $bugReport->reporter?->name,
                    'email' => $bugReport->reporter?->email,
                ],
                'debugger_context' => $bugReport->meta['debugger']['context'] ?? null,
                'debugger_meta' => $bugReport->meta['debugger']['meta'] ?? [],
                'share_url' => $bugReport->publicShareUrl(),
                'artifacts' => $bugReport->artifacts->map(fn ($artifact) => [
                    'kind' => $artifact->kind->value,
                    'content_type' => $artifact->content_type,
                    'url' => $this->temporaryUrl($artifact->path),
                ])->values(),
                'debugger' => [
                    'actions' => $bugReport->debuggerActions->map->only(['sequence', 'type', 'label', 'selector', 'value', 'payload', 'happened_at']),
                    'logs' => $bugReport->debuggerLogs->map->only(['sequence', 'level', 'message', 'context', 'happened_at']),
                    'network_requests' => $bugReport->debuggerNetworkRequests->map->only(['sequence', 'method', 'url', 'status_code', 'duration_ms', 'request_headers', 'response_headers', 'meta', 'happened_at']),
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
