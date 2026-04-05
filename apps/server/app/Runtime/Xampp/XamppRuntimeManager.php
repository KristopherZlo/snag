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

    private const XAMPP_SSL_CONFIG_PATH = 'apache/conf/extra/httpd-ssl.conf';

    private const XAMPP_SSL_CERT_PATH = 'apache/conf/ssl.crt/server.crt';

    private const XAMPP_SSL_KEY_PATH = 'apache/conf/ssl.key/server.key';

    private ?string $pnpmBinary = null;

    public function __construct(
        private readonly Application $app,
        private readonly Filesystem $files,
        private readonly XamppDatabaseProvisioner $databaseProvisioner,
        private readonly XamppRuntimeConfigRepository $runtimeConfig,
        private readonly XamppTlsCertificateManager $tlsCertificates,
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

    public function ensureManagedPortsAreAvailable(XamppRuntimeProfile $profile): void
    {
        $this->ensurePortAvailable(
            serviceName: 'Vite',
            host: $profile->viteHost,
            port: $profile->vitePort,
            readyUrl: rtrim($profile->viteUrl(), '/').'/@vite/client',
            alreadyReadyDetail: 'An existing Vite dev server is already responding on that port.',
        );

        $this->ensurePortAvailable(
            serviceName: 'Reverb',
            host: $profile->reverbHost,
            port: $profile->reverbPort,
            readyUrl: null,
            alreadyReadyDetail: null,
        );
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
                environment: [
                    'APP_URL' => $profile->appUrl,
                    'VITE_DEV_SERVER_HOST' => $profile->viteHost,
                    'VITE_DEV_SERVER_PORT' => (string) $profile->vitePort,
                    'VITE_DEV_SERVER_HTTPS' => $profile->usesHttps() ? 'true' : 'false',
                    'VITE_DEV_SERVER_ORIGIN' => $profile->viteUrl(),
                    ...$this->viteCertificateEnvironment($profile),
                ],
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
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => 0,
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
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
            ],
        ]);

        $response = @file_get_contents($url, false, $context);

        if ($response === false && empty($http_response_header)) {
            return false;
        }

        $statusLine = $http_response_header[0] ?? '';

        return preg_match('/\s(2|3)\d{2}\s/', $statusLine) === 1;
    }

    private function ensurePortAvailable(
        string $serviceName,
        string $host,
        int $port,
        ?string $readyUrl,
        ?string $alreadyReadyDetail,
    ): void {
        if (! $this->probeTcp($host, $port)) {
            return;
        }

        $detail = 'Another process is already listening on that port.';

        if ($readyUrl !== null && $alreadyReadyDetail !== null && $this->probeHttp($readyUrl)) {
            $detail = $alreadyReadyDetail;
        }

        throw new RuntimeException(sprintf(
            '%s port %d on %s is already in use. %s Stop the existing process or choose a different port.',
            $serviceName,
            $port,
            $host,
            $detail,
        ));
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

    /**
     * @return array<string, string>
     */
    private function viteCertificateEnvironment(XamppRuntimeProfile $profile): array
    {
        if (! $profile->usesHttps()) {
            return [];
        }

        $generatedCertificate = $this->tlsCertificates->ensureCertificateForHosts([
            (string) parse_url($profile->appUrl, PHP_URL_HOST),
            $profile->viteHost,
        ]);

        if ($generatedCertificate !== null) {
            return [
                'VITE_DEV_SERVER_CERT' => $generatedCertificate['cert'],
                'VITE_DEV_SERVER_KEY' => $generatedCertificate['key'],
            ];
        }

        $certificatePaths = $this->apacheSslCertificatePaths();

        if ($certificatePaths === null) {
            return [];
        }

        return [
            'VITE_DEV_SERVER_CERT' => $certificatePaths['cert'],
            'VITE_DEV_SERVER_KEY' => $certificatePaths['key'],
        ];
    }

    /**
     * @return array{cert:string, key:string}|null
     */
    private function apacheSslCertificatePaths(): ?array
    {
        $xamppRoot = $this->xamppRoot();

        if ($xamppRoot === null) {
            return null;
        }

        $configPath = $xamppRoot.DIRECTORY_SEPARATOR.self::XAMPP_SSL_CONFIG_PATH;

        if ($this->files->exists($configPath)) {
            $configContents = $this->files->get($configPath);
            $certificateRelativePath = $this->matchApacheSslPath($configContents, 'SSLCertificateFile');
            $keyRelativePath = $this->matchApacheSslPath($configContents, 'SSLCertificateKeyFile');

            if ($certificateRelativePath !== null && $keyRelativePath !== null) {
                $certificatePath = $this->resolveApachePath($xamppRoot, $certificateRelativePath);
                $keyPath = $this->resolveApachePath($xamppRoot, $keyRelativePath);

                if ($this->files->exists($certificatePath) && $this->files->exists($keyPath)) {
                    return [
                        'cert' => $certificatePath,
                        'key' => $keyPath,
                    ];
                }
            }
        }

        $certificatePath = $xamppRoot.DIRECTORY_SEPARATOR.self::XAMPP_SSL_CERT_PATH;
        $keyPath = $xamppRoot.DIRECTORY_SEPARATOR.self::XAMPP_SSL_KEY_PATH;

        if (! $this->files->exists($certificatePath) || ! $this->files->exists($keyPath)) {
            return null;
        }

        return [
            'cert' => $certificatePath,
            'key' => $keyPath,
        ];
    }

    private function matchApacheSslPath(string $configContents, string $directive): ?string
    {
        $pattern = sprintf('/^[ \t]*%s[ \t]+"([^"]+)"[ \t]*$/mi', preg_quote($directive, '/'));

        if (! preg_match($pattern, $configContents, $matches)) {
            return null;
        }

        return $matches[1] ?? null;
    }

    private function resolveApachePath(string $xamppRoot, string $configuredPath): string
    {
        if (preg_match('/^[A-Za-z]:[\/\\\\]/', $configuredPath) === 1) {
            return str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $configuredPath);
        }

        return $xamppRoot.DIRECTORY_SEPARATOR.str_replace(['/', '\\'], DIRECTORY_SEPARATOR, ltrim($configuredPath, '/\\'));
    }

    private function xamppRoot(): ?string
    {
        $normalizedBasePath = str_replace('\\', '/', $this->app->basePath());
        $markerIndex = stripos($normalizedBasePath, '/htdocs/');

        if ($markerIndex === false) {
            return null;
        }

        return substr($normalizedBasePath, 0, $markerIndex);
    }

    private function serverPath(string $path = ''): string
    {
        return $this->app->basePath($path);
    }
}
