<?php

namespace App\Services\Reports;

use App\Models\UploadSession;
use Illuminate\Support\Facades\Storage;

class PublicCaptureCleanupService
{
    public function purgeExpiredSessions(?int $batchSize = null): int
    {
        $batchSize ??= max(1, (int) config('snag.capture.public.cleanup.batch_size', 100));
        $graceMinutes = max(1, (int) config('snag.capture.public.cleanup.orphan_grace_minutes', 60));
        $disk = Storage::disk(config('snag.storage.artifact_disk'));

        $sessions = UploadSession::query()
            ->where('mode', 'public')
            ->whereDoesntHave('bugReport')
            ->where(function ($query) use ($graceMinutes): void {
                $query->where('expires_at', '<=', now())
                    ->orWhere(function ($orQuery) use ($graceMinutes): void {
                        $orQuery->whereNotNull('consumed_at')
                            ->where('consumed_at', '<=', now()->subMinutes($graceMinutes));
                    });
            })
            ->orderBy('expires_at')
            ->limit($batchSize)
            ->get();

        foreach ($sessions as $session) {
            $disk->deleteDirectory("org/{$session->organization_id}/uploads/{$session->token}");
            $session->delete();
        }

        return $sessions->count();
    }
}
