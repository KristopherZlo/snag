<?php

namespace App\Runtime\Xampp;

use Illuminate\Contracts\Foundation\Application;

class XamppRuntimeFallbackFactory
{
    public function __construct(
        private readonly Application $app,
    ) {}

    /**
     * @param  array<string, mixed>  $server
     */
    public function fromServer(array $server): ?XamppRuntimeProfile
    {
        if (! $this->shouldApplyFallback()) {
            return null;
        }

        $defaults = XamppRuntimeProfile::defaults();
        $host = $this->host($server);
        $scheme = $this->scheme($server);
        $projectSlug = basename(dirname(dirname($this->app->basePath())));

        return new XamppRuntimeProfile(
            appUrl: sprintf('%s://%s/%s', $scheme, $host, $projectSlug),
            dbHost: $defaults->dbHost,
            dbPort: $defaults->dbPort,
            dbDatabase: $defaults->dbDatabase,
            dbUsername: $defaults->dbUsername,
            dbPassword: $defaults->dbPassword,
            viteHost: $this->hostnameOnly($host),
            vitePort: $defaults->vitePort,
            reverbHost: $this->hostnameOnly($host),
            reverbPort: $defaults->reverbPort,
        );
    }

    private function shouldApplyFallback(): bool
    {
        if ($this->app->runningInConsole() || $this->app->runningUnitTests()) {
            return false;
        }

        if (! filter_var(env('XAMPP_WEB_FALLBACK_ENABLED', true), FILTER_VALIDATE_BOOL)) {
            return false;
        }

        $basePath = str_replace('\\', '/', strtolower($this->app->basePath()));

        return str_contains($basePath, '/xampp/htdocs/');
    }

    /**
     * @param  array<string, mixed>  $server
     */
    private function host(array $server): string
    {
        $host = (string) ($server['HTTP_HOST'] ?? 'localhost');

        return $host !== '' ? $host : 'localhost';
    }

    /**
     * @param  array<string, mixed>  $server
     */
    private function scheme(array $server): string
    {
        $https = strtolower((string) ($server['HTTPS'] ?? ''));
        $forwardedProto = strtolower((string) ($server['HTTP_X_FORWARDED_PROTO'] ?? ''));

        if (in_array($https, ['on', '1'], true) || $forwardedProto === 'https') {
            return 'https';
        }

        return 'http';
    }

    private function hostnameOnly(string $host): string
    {
        return (string) preg_replace('/:\d+$/', '', $host);
    }
}
