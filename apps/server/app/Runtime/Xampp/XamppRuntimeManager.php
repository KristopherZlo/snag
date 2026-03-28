<?php

namespace App\Runtime\Xampp;

use Illuminate\Contracts\Foundation\Application;
use Illuminate\Filesystem\Filesystem;
use RuntimeException;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;

class XamppRuntimeManager
{
    private const DEFAULT_PROCESS_STOP_TIMEOUT = 5;

    private const HTTP_TIMEOUT_SECONDS = 2;

    private ?string $pnpmBinary = null;

    public function __construct(
        private readonly Application $app,
        private readonly Filesystem $files,
        private readonly XamppDatabaseProvisioner $databaseProvisioner,
        private readonly XamppRuntimeConfigRepository $runtimeConfig,
    ) {}

    public function activate(XamppRuntimeProfile $profile): void
    {
        $this->runtimeConfig->write($profile->configOverrides());
        $this->removeHotFile();
    }

    /**
     * @return array<int, array{name: string, managed: bool, status: string, detail: string}>
     */
    public function captureStatusSnapshot(XamppRuntimeProfile $profile, array $services): array
    {
        $database = $this->databaseProvisioner->probe($profile);

        return [
            [
                'name' => 'apache',
                'managed' => false,
                'status' => $this->probeHttp($profile->healthUrl()) ? 'ready' : 'down',
                'detail' => $profile->healthUrl(),
            ],
            [
                'name' => 'mysql',
                'managed' => false,
                'status' => $database['healthy'] ? 'ready' : 'down',
                'detail' => $database['message'],
            ],
            ...array_map(function (ManagedService $service): array {
                return [
                    'name' => $service->name(),
                    'managed' => true,
                    'status' => $service->isReady()
                        ? 'ready'
                        : ($service->isRunning() ? 'starting' : 'down'),
                    'detail' => $service->endpoint() ?? 'background process',
                ];
            }, $services),
        ];
    }

    public function deactivate(): void
    {
        $this->removeHotFile();
        $this->runtimeConfig->clear();
    }

    public function ensureDatabase(XamppRuntimeProfile $profile): void
    {
        $this->databaseProvisioner->ensureDatabase($profile);
    }

    public function ensureMigrationsApplied(): void
    {
        $this->runArtisan(['migrate', '--force']);
    }

    /**
     * @return list<ManagedService>
     */
    public function makeManagedServices(XamppRuntimeProfile $profile): array
    {
        return [
            new ManagedService(
                name: 'queue',
                command: $this->artisanCommand(['queue:work', '--tries=1', '--timeout=120', '--sleep=1']),
                workingDirectory: $this->serverPath(),
                readinessProbe: fn (ManagedService $service): bool => $service->isRunning(),
            ),
            new ManagedService(
                name: 'scheduler',
                command: $this->artisanCommand(['schedule:work']),
                workingDirectory: $this->serverPath(),
                readinessProbe: fn (ManagedService $service): bool => $service->isRunning(),
            ),
            new ManagedService(
                name: 'reverb',
                command: $this->artisanCommand([
                    'reverb:start',
                    '--host='.$profile->reverbHost,
                    '--port='.$profile->reverbPort,
                ]),
                workingDirectory: $this->serverPath(),
                readinessProbe: fn (): bool => $this->probeTcp($profile->reverbHost, $profile->reverbPort),
                endpoint: $profile->reverbUrl(),
            ),
            new ManagedService(
                name: 'vite',
                command: [
                    $this->resolvePnpmBinary(),
                    '--dir',
                    $this->serverPath(),
                    'exec',
                    'vite',
                    '--host',
                    $profile->viteHost,
                    '--port',
                    (string) $profile->vitePort,
                    '--strictPort',
                    '--clearScreen',
                    'false',
                ],
                workingDirectory: $this->serverPath(),
                readinessProbe: fn (): bool => $this->probeHttp(rtrim($profile->viteUrl(), '/').'/@vite/client'),
                endpoint: $profile->viteUrl(),
            ),
        ];
    }

    /**
     * @param  list<ManagedService>  $services
     */
    public function stopServices(array $services): void
    {
        foreach (array_reverse($services) as $service) {
            $service->stop(self::DEFAULT_PROCESS_STOP_TIMEOUT);
        }
    }

    public function summarizeUnexpectedExit(ManagedService $service): string
    {
        $message = sprintf(
            'Service [%s] exited unexpectedly with code %s.',
            $service->name(),
            $service->exitCode() ?? 'unknown'
        );

        $output = $service->outputTail();

        if ($output === '') {
            return $message;
        }

        return $message.PHP_EOL.PHP_EOL.'Last output:'.PHP_EOL.$output;
    }

    /**
     * @param  list<ManagedService>  $services
     */
    public function waitUntilReady(array $services, int $timeoutSeconds): void
    {
        $deadline = microtime(true) + max(1, $timeoutSeconds);

        while (microtime(true) < $deadline) {
            foreach ($services as $service) {
                if ($service->hasExitedUnexpectedly()) {
                    throw new RuntimeException($this->summarizeUnexpectedExit($service));
                }
            }

            if ($this->allServicesReady($services)) {
                return;
            }

            usleep(250_000);
        }

        $notReady = array_map(
            fn (ManagedService $service): string => $service->name(),
            array_filter($services, fn (ManagedService $service): bool => ! $service->isReady())
        );

        throw new RuntimeException(
            'Timed out while waiting for services to become ready: '.implode(', ', $notReady)
        );
    }

    /**
     * @param  list<ManagedService>  $services
     */
    public function startServices(array $services): void
    {
        foreach ($services as $service) {
            $service->start();
        }
    }

    /**
     * @param  list<string>  $arguments
     * @return list<string>
     */
    private function artisanCommand(array $arguments): array
    {
        return [
            PHP_BINARY,
            'artisan',
            ...$arguments,
        ];
    }

    /**
     * @param  list<ManagedService>  $services
     */
    private function allServicesReady(array $services): bool
    {
        foreach ($services as $service) {
            if (! $service->isReady()) {
                return false;
            }
        }

        return true;
    }

    private function probeHttp(string $url): bool
    {
        if (function_exists('curl_init')) {
            $handle = curl_init($url);

            curl_setopt_array($handle, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_CONNECTTIMEOUT => self::HTTP_TIMEOUT_SECONDS,
                CURLOPT_TIMEOUT => self::HTTP_TIMEOUT_SECONDS,
                CURLOPT_NOBODY => false,
            ]);

            curl_exec($handle);

            $statusCode = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
            $errorNumber = curl_errno($handle);

            curl_close($handle);

            return $errorNumber === 0 && $statusCode >= 200 && $statusCode < 400;
        }

        unset($http_response_header);

        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => self::HTTP_TIMEOUT_SECONDS,
                'ignore_errors' => true,
            ],
        ]);

        $response = @file_get_contents($url, false, $context);

        if ($response === false && empty($http_response_header)) {
            return false;
        }

        $statusLine = $http_response_header[0] ?? '';

        return preg_match('/\s(2|3)\d{2}\s/', $statusLine) === 1;
    }

    private function probeTcp(string $host, int $port): bool
    {
        $connection = @fsockopen($host, $port, $errorCode, $errorMessage, self::HTTP_TIMEOUT_SECONDS);

        if ($connection === false) {
            return false;
        }

        fclose($connection);

        return true;
    }

    private function removeHotFile(): void
    {
        $this->files->delete($this->serverPath('public/hot'));
    }

    /**
     * @param  list<string>  $arguments
     */
    private function runArtisan(array $arguments): void
    {
        $process = new Process($this->artisanCommand($arguments), $this->serverPath());
        $process->setTimeout(null);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new RuntimeException(trim($process->getErrorOutput().PHP_EOL.$process->getOutput()));
        }
    }

    private function resolvePnpmBinary(): string
    {
        if ($this->pnpmBinary !== null) {
            return $this->pnpmBinary;
        }

        $finder = new ExecutableFinder;
        $binary = $finder->find('pnpm');

        if ($binary === null && DIRECTORY_SEPARATOR === '\\') {
            $binary = $finder->find('pnpm.cmd');
        }

        if ($binary === null) {
            throw new RuntimeException('Unable to locate pnpm. Install pnpm and ensure it is available on PATH.');
        }

        return $this->pnpmBinary = $binary;
    }

    private function serverPath(string $path = ''): string
    {
        return $this->app->basePath($path);
    }
}
