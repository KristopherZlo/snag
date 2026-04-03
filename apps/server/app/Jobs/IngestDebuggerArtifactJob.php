<?php

namespace App\Jobs;

use App\Enums\ArtifactKind;
use App\Enums\BugReportStatus;
use App\Events\ReportStatusUpdated;
use App\Models\BugReport;
use App\Models\DebuggerAction;
use App\Models\DebuggerLog;
use App\Models\DebuggerNetworkRequest;
use App\Services\Reports\DebuggerPayloadNormalizer;
use App\Services\Reports\DebuggerPayloadSanitizer;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;

class IngestDebuggerArtifactJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $reportId) {}

    public function handle(DebuggerPayloadNormalizer $normalizer, DebuggerPayloadSanitizer $sanitizer): void
    {
        $report = BugReport::query()->with('artifacts')->findOrFail($this->reportId);
        $artifact = $report->artifacts->firstWhere('kind', ArtifactKind::Debugger);

        if (! $artifact) {
            $report->forceFill([
                'status' => BugReportStatus::Ready,
                'ready_at' => now(),
            ])->save();

            event(new ReportStatusUpdated($report));

            return;
        }

        $payload = json_decode(
            Storage::disk($artifact->disk)->get($artifact->path),
            true,
            flags: JSON_THROW_ON_ERROR,
        );
        $payload = $sanitizer->sanitizePayload(is_array($payload) ? $payload : []);
        $encodedPayload = json_encode($payload, JSON_THROW_ON_ERROR);

        Storage::disk($artifact->disk)->put($artifact->path, $encodedPayload);
        $artifact->forceFill([
            'byte_size' => strlen($encodedPayload),
            'checksum' => hash('sha256', $encodedPayload),
        ])->save();

        $report->debuggerActions()->delete();
        $report->debuggerLogs()->delete();
        $report->debuggerNetworkRequests()->delete();

        foreach ($normalizer->actions($payload) as $index => $action) {
            DebuggerAction::query()->create([
                'organization_id' => $report->organization_id,
                'bug_report_id' => $report->id,
                'sequence' => $index + 1,
                'type' => $action['type'] ?? 'event',
                'label' => $action['label'] ?? null,
                'selector' => $action['selector'] ?? null,
                'value' => $action['value'] ?? null,
                'payload' => is_array($action['payload'] ?? null) ? $action['payload'] : [],
                'happened_at' => $action['happened_at'] ?? null,
            ]);
        }

        foreach ($normalizer->logs($payload) as $index => $log) {
            DebuggerLog::query()->create([
                'organization_id' => $report->organization_id,
                'bug_report_id' => $report->id,
                'sequence' => $index + 1,
                'level' => $log['level'] ?? 'info',
                'message' => $log['message'] ?? '',
                'context' => $log['context'] ?? [],
                'happened_at' => $log['happened_at'] ?? null,
            ]);
        }

        foreach ($normalizer->networkRequests($payload) as $index => $networkRequest) {
            DebuggerNetworkRequest::query()->create([
                'organization_id' => $report->organization_id,
                'bug_report_id' => $report->id,
                'sequence' => $index + 1,
                'method' => $networkRequest['method'] ?? 'GET',
                'url' => $networkRequest['url'] ?? '',
                'status_code' => $networkRequest['status_code'] ?? $networkRequest['status'] ?? null,
                'duration_ms' => $networkRequest['duration_ms'] ?? null,
                'request_headers' => $networkRequest['request_headers'] ?? [],
                'response_headers' => $networkRequest['response_headers'] ?? [],
                'meta' => is_array($networkRequest['meta'] ?? null) ? $networkRequest['meta'] : [],
                'happened_at' => $networkRequest['happened_at'] ?? null,
            ]);
        }

        $existingMeta = is_array($report->meta) ? $report->meta : [];

        $report->forceFill([
            'meta' => array_replace_recursive($existingMeta, [
                'debugger' => array_filter([
                    'context' => $normalizer->context($payload),
                    'meta' => $normalizer->meta($payload),
                ], fn (mixed $value): bool => $value !== null && $value !== []),
            ]),
            'status' => BugReportStatus::Ready,
            'ready_at' => now(),
        ])->save();

        event(new ReportStatusUpdated($report));
    }
}
