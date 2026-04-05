<?php

namespace App\Runtime\Xampp;

class XamppRuntimeProfile
{
    private const LOCAL_REVERB_APP_ID = 'snag-xampp';

    private const LOCAL_REVERB_APP_KEY = 'snag-xampp-key';

    private const LOCAL_REVERB_APP_SECRET = 'snag-xampp-secret';

    public function __construct(
        public readonly string $appUrl,
        public readonly string $dbHost,
        public readonly int $dbPort,
        public readonly string $dbDatabase,
        public readonly string $dbUsername,
        public readonly string $dbPassword,
        public readonly string $viteHost,
        public readonly int $vitePort,
        public readonly string $reverbHost,
        public readonly int $reverbPort,
    ) {}

    public static function defaults(): self
    {
        return new self(
            appUrl: 'http://localhost/snag',
            dbHost: '127.0.0.1',
            dbPort: 3306,
            dbDatabase: 'snag_xampp',
            dbUsername: 'root',
            dbPassword: '',
            viteHost: '127.0.0.1',
            vitePort: 5173,
            reverbHost: '127.0.0.1',
            reverbPort: 8080,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function configOverrides(): array
    {
        return [
            'app.url' => $this->appUrl,
            'database.default' => 'mysql',
            'database.connections.mysql.host' => $this->dbHost,
            'database.connections.mysql.port' => $this->dbPort,
            'database.connections.mysql.database' => $this->dbDatabase,
            'database.connections.mysql.username' => $this->dbUsername,
            'database.connections.mysql.password' => $this->dbPassword,
            'queue.default' => 'database',
            'session.driver' => 'database',
            'session.path' => $this->cookiePath(),
            'cache.default' => 'file',
            'mail.default' => 'log',
            'filesystems.default' => 'local',
            'snag.storage.artifact_disk' => 'local',
            'broadcasting.default' => 'reverb',
            'reverb.apps.apps.0.key' => self::LOCAL_REVERB_APP_KEY,
            'reverb.apps.apps.0.secret' => self::LOCAL_REVERB_APP_SECRET,
            'reverb.apps.apps.0.app_id' => self::LOCAL_REVERB_APP_ID,
            'reverb.servers.reverb.host' => $this->reverbHost,
            'reverb.servers.reverb.port' => $this->reverbPort,
            'reverb.servers.reverb.hostname' => $this->reverbHost,
            'reverb.apps.apps.0.options.host' => $this->reverbHost,
            'reverb.apps.apps.0.options.port' => $this->reverbPort,
            'reverb.apps.apps.0.options.scheme' => 'http',
            'reverb.apps.apps.0.options.useTLS' => false,
            'broadcasting.connections.reverb.key' => self::LOCAL_REVERB_APP_KEY,
            'broadcasting.connections.reverb.secret' => self::LOCAL_REVERB_APP_SECRET,
            'broadcasting.connections.reverb.app_id' => self::LOCAL_REVERB_APP_ID,
            'broadcasting.connections.reverb.options.host' => $this->reverbHost,
            'broadcasting.connections.reverb.options.port' => $this->reverbPort,
            'broadcasting.connections.reverb.options.scheme' => 'http',
            'broadcasting.connections.reverb.options.useTLS' => false,
        ];
    }

    public function healthUrl(): string
    {
        return rtrim($this->appUrl, '/').'/up';
    }

    public function viteUrl(): string
    {
        return sprintf('%s://%s:%d', $this->usesHttps() ? 'https' : 'http', $this->viteHost, $this->vitePort);
    }

    public function reverbUrl(): string
    {
        return sprintf('http://%s:%d', $this->reverbHost, $this->reverbPort);
    }

    private function cookiePath(): string
    {
        $path = (string) parse_url($this->appUrl, PHP_URL_PATH);

        return $path === '' ? '/' : rtrim($path, '/');
    }

    public function usesHttps(): bool
    {
        return strtolower((string) parse_url($this->appUrl, PHP_URL_SCHEME)) === 'https';
    }
}
