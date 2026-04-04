<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Enums\ArtifactKind;
use App\Models\ReportArtifact;
use App\Models\BugIssue;
use App\Models\BugReport;
use App\Models\Organization;
use App\Services\Reports\DebuggerPayloadNormalizer;
use App\Services\Reports\DebuggerPayloadSanitizer;
use App\Services\BugIssues\BugIssuePresenter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function show(
        Request $request,
        BugReport $bugReport,
        BugIssuePresenter $issues,
        DebuggerPayloadNormalizer $debuggerNormalizer,
        DebuggerPayloadSanitizer $debuggerSanitizer,
    ): Response
    {
        $this->authorize('view', $bugReport);
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');

        $bugReport->load(['artifacts', 'debuggerActions', 'debuggerLogs', 'debuggerNetworkRequests', 'organization', 'reporter', 'issues.externalLinks']);
        $fallbackDebugger = $this->fallbackDebuggerPayload($bugReport, $debuggerNormalizer, $debuggerSanitizer);
        $resolvedCapturedAt = optional($bugReport->captured_at ?? $bugReport->created_at)->toIso8601String();
        $debuggerContext = data_get($bugReport->meta, 'debugger.context') ?? $fallbackDebugger['context'] ?? $this->fallbackDebuggerContextFromMeta($bugReport);
        $debuggerMeta = data_get($bugReport->meta, 'debugger.meta') ?? $fallbackDebugger['meta'] ?? $this->fallbackDebuggerMetaFromMeta($bugReport);
        $debuggerActions = $bugReport->debuggerActions->isNotEmpty()
            ? $bugReport->debuggerActions->map->only(['sequence', 'type', 'label', 'selector', 'value', 'payload', 'happened_at'])->values()
            : collect($fallbackDebugger['actions'] ?? [])->values();
        $debuggerLogs = $bugReport->debuggerLogs->isNotEmpty()
            ? $bugReport->debuggerLogs->map->only(['sequence', 'level', 'message', 'context', 'happened_at'])->values()
            : collect($fallbackDebugger['logs'] ?? [])->values();
        $debuggerNetworkRequests = $bugReport->debuggerNetworkRequests->isNotEmpty()
            ? $bugReport->debuggerNetworkRequests->map->only(['sequence', 'method', 'url', 'status_code', 'duration_ms', 'request_headers', 'response_headers', 'meta', 'happened_at'])->values()
            : collect($fallbackDebugger['network_requests'] ?? [])->values();

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
                'captured_at' => $resolvedCapturedAt,
                'created_at' => $resolvedCapturedAt,
                'organization' => [
                    'name' => $bugReport->organization->name,
                    'slug' => $bugReport->organization->slug,
                ],
                'reporter' => [
                    'name' => $bugReport->reporter?->name,
                    'email' => $bugReport->reporter?->email,
                ],
                'debugger_context' => $debuggerContext,
                'debugger_meta' => $debuggerMeta ?? [],
                'share_url' => null,
                'has_public_share' => $bugReport->hasPublicShare(),
                'artifacts' => $bugReport->artifacts->map(fn ($artifact) => [
                    'kind' => $artifact->kind->value,
                    'content_type' => $artifact->content_type,
                    'url' => $this->temporaryUrl($artifact->path),
                ])->values(),
                'debugger' => [
                    'actions' => $debuggerActions,
                    'logs' => $debuggerLogs,
                    'network_requests' => $debuggerNetworkRequests,
                ],
                'linked_issue' => ($linkedIssue = $bugReport->issues->first()) ? $issues->listItem($linkedIssue) : null,
            ],
            'availableIssues' => BugIssue::query()
                ->with(['reports.artifacts', 'reports.reporter', 'externalLinks', 'shareTokens', 'assignee', 'creator'])
                ->where('organization_id', $organization->id)
                ->where('workflow_state', '!=', 'done')
                ->latest()
                ->take(20)
                ->get()
                ->map(fn (BugIssue $issue) => $issues->listItem($issue))
                ->values(),
        ]);
    }

    /**
     * @return array{context?: array<string, mixed>|null, meta?: array<string, mixed>, actions?: array<int, array<string, mixed>>, logs?: array<int, array<string, mixed>>, network_requests?: array<int, array<string, mixed>>}
     */
    private function fallbackDebuggerPayload(
        BugReport $bugReport,
        DebuggerPayloadNormalizer $normalizer,
        DebuggerPayloadSanitizer $sanitizer,
    ): array {
        $artifact = $bugReport->artifacts->firstWhere('kind', ArtifactKind::Debugger);

        if (! $artifact instanceof ReportArtifact) {
            return [];
        }

        $disk = Storage::disk($artifact->disk);

        if (! $disk->exists($artifact->path)) {
            return [];
        }

        try {
            $payload = json_decode(
                $disk->get($artifact->path),
                true,
                flags: JSON_THROW_ON_ERROR,
            );
        } catch (\Throwable) {
            return [];
        }

        if (! is_array($payload)) {
            return [];
        }

        $payload = $sanitizer->sanitizePayload($payload);
        $actions = array_map(
            fn (array $action, int $index): array => [
                'sequence' => $action['sequence'] ?? ($index + 1),
                'type' => $action['type'] ?? 'event',
                'label' => $action['label'] ?? null,
                'selector' => $action['selector'] ?? null,
                'value' => $action['value'] ?? null,
                'payload' => is_array($action['payload'] ?? null) ? $action['payload'] : [],
                'happened_at' => $action['happened_at'] ?? null,
            ],
            $normalizer->actions($payload),
            array_keys($normalizer->actions($payload)),
        );
        $logs = array_map(
            fn (array $log, int $index): array => [
                'sequence' => $log['sequence'] ?? ($index + 1),
                'level' => $log['level'] ?? 'info',
                'message' => $log['message'] ?? '',
                'context' => is_array($log['context'] ?? null) ? $log['context'] : [],
                'happened_at' => $log['happened_at'] ?? null,
            ],
            $normalizer->logs($payload),
            array_keys($normalizer->logs($payload)),
        );
        $networkRequests = array_map(
            fn (array $request, int $index): array => [
                'sequence' => $request['sequence'] ?? ($index + 1),
                'method' => $request['method'] ?? 'GET',
                'url' => $request['url'] ?? '',
                'status_code' => $request['status_code'] ?? $request['status'] ?? null,
                'duration_ms' => $request['duration_ms'] ?? null,
                'request_headers' => is_array($request['request_headers'] ?? null) ? $request['request_headers'] : [],
                'response_headers' => is_array($request['response_headers'] ?? null) ? $request['response_headers'] : [],
                'meta' => is_array($request['meta'] ?? null) ? $request['meta'] : [],
                'happened_at' => $request['happened_at'] ?? null,
            ],
            $normalizer->networkRequests($payload),
            array_keys($normalizer->networkRequests($payload)),
        );

        return [
            'context' => $normalizer->context($payload),
            'meta' => $normalizer->meta($payload),
            'actions' => $actions,
            'logs' => $logs,
            'network_requests' => $networkRequests,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function fallbackDebuggerContextFromMeta(BugReport $bugReport): ?array
    {
        $sessionMeta = is_array(data_get($bugReport->meta, 'session_meta')) ? data_get($bugReport->meta, 'session_meta') : [];
        $clientMeta = is_array(data_get($bugReport->meta, 'client_meta')) ? data_get($bugReport->meta, 'client_meta') : [];

        $context = array_filter([
            'url' => $clientMeta['page_url'] ?? $sessionMeta['page_url'] ?? null,
            'title' => $clientMeta['page_title'] ?? $sessionMeta['page_title'] ?? null,
            'viewport' => $clientMeta['viewport'] ?? $sessionMeta['viewport'] ?? null,
            'locale' => $clientMeta['locale'] ?? $sessionMeta['locale'] ?? null,
            'language' => $clientMeta['locale'] ?? $sessionMeta['locale'] ?? null,
            'user_agent' => $clientMeta['user_agent'] ?? $sessionMeta['user_agent'] ?? null,
            'platform' => $clientMeta['platform'] ?? $sessionMeta['platform'] ?? null,
            'timezone' => $clientMeta['timezone'] ?? $sessionMeta['timezone'] ?? null,
            'screen' => $clientMeta['screen'] ?? $sessionMeta['screen'] ?? null,
            'referrer' => $clientMeta['referrer'] ?? $sessionMeta['referrer'] ?? null,
            'user' => $clientMeta['user'] ?? $sessionMeta['user'] ?? null,
        ], fn (mixed $value): bool => $value !== null && $value !== []);

        return $context === [] ? null : $context;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function fallbackDebuggerMetaFromMeta(BugReport $bugReport): ?array
    {
        $sessionMeta = is_array(data_get($bugReport->meta, 'session_meta')) ? data_get($bugReport->meta, 'session_meta') : [];
        $clientMeta = is_array(data_get($bugReport->meta, 'client_meta')) ? data_get($bugReport->meta, 'client_meta') : [];

        $meta = array_filter(array_merge($sessionMeta, $clientMeta), fn (mixed $value): bool => $value !== null && $value !== []);

        return $meta === [] ? null : $meta;
    }

    private function temporaryUrl(string $path): ?string
    {
        $disk = Storage::disk(config('snag.storage.artifact_disk'));

        return method_exists($disk, 'temporaryUrl')
            ? $disk->temporaryUrl($path, now()->addMinutes((int) config('snag.capture.share_url_ttl_minutes')))
            : null;
    }
}
