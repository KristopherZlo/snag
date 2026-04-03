<?php

namespace App\Console\Commands;

use App\Services\Reports\PublicCaptureCleanupService;
use Illuminate\Console\Command;

class CleanupPublicCaptureUploadsCommand extends Command
{
    protected $signature = 'snag:cleanup-public-captures
        {--batch= : Maximum number of expired/orphaned public capture sessions to purge in one run}';

    protected $description = 'Delete expired or orphaned public capture upload sessions and their staged artifacts.';

    public function handle(PublicCaptureCleanupService $cleanup): int
    {
        $batch = $this->option('batch');
        $deleted = $cleanup->purgeExpiredSessions($batch !== null ? (int) $batch : null);

        $this->components->info("Purged {$deleted} expired public capture session(s).");

        return self::SUCCESS;
    }
}
