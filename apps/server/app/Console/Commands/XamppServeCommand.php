<?php

namespace App\Console\Commands;

use App\Runtime\Xampp\LocalNetworkAddressDetector;
use App\Runtime\Xampp\ManagedService;
use App\Runtime\Xampp\XamppRuntimeManager;
use App\Runtime\Xampp\XamppRuntimeProfile;
use Illuminate\Console\Command;
use RuntimeException;
use Throwable;

class XamppServeCommand extends Command
{
    protected $signature = 'snag:xampp
        {--app-url= : Public URL served by Apache}
        {--db-host=127.0.0.1 : MySQL host}
        {--db-port=3306 : MySQL port}
        {--db-database=snag_xampp : MySQL database name}
        {--db-username=root : MySQL username}
        {--db-password= : MySQL password}
        {--vite-host= : Vite host}
        {--vite-port=5173 : Vite port}
        {--reverb-host= : Reverb host}
        {--reverb-port=8080 : Reverb port}
        {--boot-timeout=45 : Seconds to wait for managed services to become ready}
        {--status-interval=5 : Seconds between status snapshots}
        {--stop-after=0 : Auto-stop after N seconds for smoke tests}';

    protected $description = 'Run Snag in XAMPP mode with Apache, MySQL, Vite, queue, scheduler, and Reverb.';

    private bool $interruptRequested = false;

    /**
     * @var list<ManagedService>
     */
    private array $services = [];

    public function handle(XamppRuntimeManager $manager, LocalNetworkAddressDetector $addressDetector): int
    {
        $profile = $this->profileFromOptions($addressDetector);
        $this->registerSignalHandlers();

        $this->components->info("Starting Snag in XAMPP mode at {$profile->appUrl}");
        $this->components->twoColumnDetail('MySQL', sprintf(
            '%s:%d/%s',
            $profile->dbHost,
            $profile->dbPort,
            $profile->dbDatabase
        ));
        $this->components->twoColumnDetail('Vite', $profile->viteUrl());
        $this->components->twoColumnDetail('Reverb', $profile->reverbUrl());

        try {
            $manager->activate($profile);
            $manager->ensureDatabase($profile);
            $manager->ensureMigrationsApplied();

            $this->services = $manager->makeManagedServices($profile);
            $manager->startServices($this->services);
            $manager->waitUntilReady($this->services, (int) $this->option('boot-timeout'));

            $this->renderStatusTable($manager->captureStatusSnapshot($profile, $this->services));
            $this->waitLoop($manager, $profile);
        } catch (Throwable $exception) {
            report($exception);
            $this->components->error($exception->getMessage());

            return self::FAILURE;
        } finally {
            $this->components->info('Stopping managed services...');
            $manager->stopServices($this->services);
            $manager->deactivate();
        }

        $this->components->info('XAMPP mode stopped cleanly.');

        return self::SUCCESS;
    }

    /**
     * @param  array<int, array{name: string, managed: bool, status: string, detail: string}>  $snapshot
     */
    private function formatStatusLine(array $snapshot): string
    {
        return collect($snapshot)
            ->map(fn (array $row): string => sprintf('%s=%s', $row['name'], $row['status']))
            ->implode('  ');
    }

    private function inferredDefaultAppUrl(string $host): string
    {
        $repositoryRoot = dirname(dirname($this->laravel->basePath()));

        return sprintf('http://%s/%s', $host, basename($repositoryRoot));
    }

    private function profileFromOptions(LocalNetworkAddressDetector $addressDetector): XamppRuntimeProfile
    {
        $localHost = $addressDetector->detect();

        return new XamppRuntimeProfile(
            appUrl: rtrim((string) ($this->option('app-url') ?: $this->inferredDefaultAppUrl($localHost)), '/'),
            dbHost: (string) $this->option('db-host'),
            dbPort: (int) $this->option('db-port'),
            dbDatabase: (string) $this->option('db-database'),
            dbUsername: (string) $this->option('db-username'),
            dbPassword: (string) $this->option('db-password'),
            viteHost: (string) ($this->option('vite-host') ?: $localHost),
            vitePort: (int) $this->option('vite-port'),
            reverbHost: (string) ($this->option('reverb-host') ?: $localHost),
            reverbPort: (int) $this->option('reverb-port'),
        );
    }

    /**
     * @param  array<int, array{name: string, managed: bool, status: string, detail: string}>  $snapshot
     */
    private function renderStatusTable(array $snapshot): void
    {
        $this->table(
            ['Service', 'Mode', 'Status', 'Detail'],
            array_map(fn (array $row): array => [
                $row['name'],
                $row['managed'] ? 'managed' : 'external',
                $row['status'],
                $row['detail'],
            ], $snapshot)
        );
    }

    private function registerSignalHandlers(): void
    {
        if (function_exists('pcntl_async_signals') && function_exists('pcntl_signal')) {
            pcntl_async_signals(true);
            pcntl_signal(SIGINT, fn (): bool => $this->interruptRequested = true);
            pcntl_signal(SIGTERM, fn (): bool => $this->interruptRequested = true);
        }

        if (function_exists('sapi_windows_set_ctrl_handler')) {
            sapi_windows_set_ctrl_handler(function (int $event): bool {
                if (defined('PHP_WINDOWS_EVENT_CTRL_C') && $event === PHP_WINDOWS_EVENT_CTRL_C) {
                    $this->interruptRequested = true;

                    return true;
                }

                if (defined('PHP_WINDOWS_EVENT_CTRL_BREAK') && $event === PHP_WINDOWS_EVENT_CTRL_BREAK) {
                    $this->interruptRequested = true;

                    return true;
                }

                return false;
            });
        }
    }

    private function waitLoop(XamppRuntimeManager $manager, XamppRuntimeProfile $profile): void
    {
        $statusIntervalSeconds = max(1, (int) $this->option('status-interval'));
        $stopAfterSeconds = max(0, (int) $this->option('stop-after'));
        $startedAt = microtime(true);
        $lastStatusAt = 0.0;

        while (true) {
            foreach ($this->services as $service) {
                if ($service->hasExitedUnexpectedly()) {
                    throw new RuntimeException($manager->summarizeUnexpectedExit($service));
                }
            }

            $now = microtime(true);

            if ($now - $lastStatusAt >= $statusIntervalSeconds) {
                $snapshot = $manager->captureStatusSnapshot($profile, $this->services);
                $this->line('['.now()->format('H:i:s').'] '.$this->formatStatusLine($snapshot));
                $lastStatusAt = $now;
            }

            if ($this->interruptRequested) {
                $this->newLine();
                $this->components->warn('Interrupt received. Beginning graceful shutdown.');

                return;
            }

            if ($stopAfterSeconds > 0 && $now - $startedAt >= $stopAfterSeconds) {
                $this->components->info('Smoke-test window elapsed. Beginning graceful shutdown.');

                return;
            }

            usleep(250_000);
        }
    }
}
