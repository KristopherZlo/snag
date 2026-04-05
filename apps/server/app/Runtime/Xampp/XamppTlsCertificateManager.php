<?php

namespace App\Runtime\Xampp;

use Illuminate\Contracts\Foundation\Application;
use Illuminate\Filesystem\Filesystem;
use RuntimeException;
use Symfony\Component\Process\Process;

class XamppTlsCertificateManager
{
    private const ROOT_CERT_FILENAME = 'snag-xampp-root.crt';

    private const ROOT_KEY_FILENAME = 'snag-xampp-root.key';

    private const SERVER_CERT_FILENAME = 'snag-xampp-server.crt';

    private const SERVER_KEY_FILENAME = 'snag-xampp-server.key';

    private const SERVER_METADATA_FILENAME = 'snag-xampp-server.json';

    private const ROOT_COMMON_NAME = 'Snag XAMPP Dev Root';

    private const ROOT_DAYS_VALID = 3650;

    private const SERVER_DAYS_VALID = 825;

    private const RENEWAL_WINDOW_SECONDS = 1_209_600;

    public function __construct(
        private readonly Application $app,
        private readonly Filesystem $files,
    ) {}

    /**
     * @param  array<int, string>  $hosts
     * @return array{cert:string, key:string}|null
     */
    public function ensureCertificateForHosts(array $hosts): ?array
    {
        $normalizedHosts = $this->normalizeHosts($hosts);

        if ($normalizedHosts === []) {
            return null;
        }

        $this->files->ensureDirectoryExists($this->certificateDirectory());

        $root = $this->ensureRootAuthority();
        $server = $this->ensureServerCertificate($root, $normalizedHosts);

        $this->trustRootCertificate($root['cert']);

        return $server;
    }

    /**
     * @param  array<int, string>  $hosts
     * @return array<int, string>
     */
    private function normalizeHosts(array $hosts): array
    {
        $normalizedHosts = [];

        foreach ($hosts as $host) {
            $value = strtolower(trim($host));

            if ($value === '' || $value === '0.0.0.0' || $value === '::') {
                continue;
            }

            $normalizedHosts[] = trim($value, '[]');
        }

        $normalizedHosts[] = 'localhost';
        $normalizedHosts[] = '127.0.0.1';

        $normalizedHosts = array_values(array_unique($normalizedHosts));
        sort($normalizedHosts);

        return $normalizedHosts;
    }

    /**
     * @return array{cert:string, key:string, cert_pem:string, key_pem:string}
     */
    private function ensureRootAuthority(): array
    {
        $rootCertPath = $this->certificateDirectory().DIRECTORY_SEPARATOR.self::ROOT_CERT_FILENAME;
        $rootKeyPath = $this->certificateDirectory().DIRECTORY_SEPARATOR.self::ROOT_KEY_FILENAME;

        if (
            $this->files->exists($rootCertPath)
            && $this->files->exists($rootKeyPath)
            && ! $this->certificateNeedsRenewal($rootCertPath)
        ) {
            return [
                'cert' => $rootCertPath,
                'key' => $rootKeyPath,
                'cert_pem' => $this->files->get($rootCertPath),
                'key_pem' => $this->files->get($rootKeyPath),
            ];
        }

        $configPath = $this->writeOpenSslConfig(self::ROOT_COMMON_NAME, []);

        try {
            $rootPrivateKey = openssl_pkey_new([
                'private_key_type' => OPENSSL_KEYTYPE_RSA,
                'private_key_bits' => 2048,
                'config' => $configPath,
            ]);

            if ($rootPrivateKey === false) {
                throw new RuntimeException('Unable to generate the Snag XAMPP root private key.');
            }

            $rootCsr = openssl_csr_new([
                'commonName' => self::ROOT_COMMON_NAME,
            ], $rootPrivateKey, [
                'config' => $configPath,
                'digest_alg' => 'sha256',
            ]);

            if ($rootCsr === false) {
                throw new RuntimeException('Unable to create the Snag XAMPP root certificate request.');
            }

            $rootCertificate = openssl_csr_sign(
                $rootCsr,
                null,
                $rootPrivateKey,
                self::ROOT_DAYS_VALID,
                [
                    'config' => $configPath,
                    'digest_alg' => 'sha256',
                    'x509_extensions' => 'v3_ca',
                ],
                random_int(1, PHP_INT_MAX),
            );

            if ($rootCertificate === false) {
                throw new RuntimeException('Unable to sign the Snag XAMPP root certificate.');
            }

            $rootCertPem = '';
            $rootKeyPem = '';

            openssl_x509_export($rootCertificate, $rootCertPem);
            openssl_pkey_export($rootPrivateKey, $rootKeyPem, null, [
                'config' => $configPath,
            ]);

            $this->files->put($rootCertPath, $rootCertPem);
            $this->files->put($rootKeyPath, $rootKeyPem);

            return [
                'cert' => $rootCertPath,
                'key' => $rootKeyPath,
                'cert_pem' => $rootCertPem,
                'key_pem' => $rootKeyPem,
            ];
        } finally {
            $this->files->delete($configPath);
        }
    }

    /**
     * @param  array{cert:string, key:string, cert_pem:string, key_pem:string}  $root
     * @param  array<int, string>  $hosts
     * @return array{cert:string, key:string}
     */
    private function ensureServerCertificate(array $root, array $hosts): array
    {
        $serverCertPath = $this->certificateDirectory().DIRECTORY_SEPARATOR.self::SERVER_CERT_FILENAME;
        $serverKeyPath = $this->certificateDirectory().DIRECTORY_SEPARATOR.self::SERVER_KEY_FILENAME;
        $metadataPath = $this->certificateDirectory().DIRECTORY_SEPARATOR.self::SERVER_METADATA_FILENAME;

        if (
            $this->files->exists($serverCertPath)
            && $this->files->exists($serverKeyPath)
            && ! $this->certificateNeedsRenewal($serverCertPath)
            && $this->certificateCoversHosts($serverCertPath, $hosts)
            && $this->serverMetadataMatches($metadataPath, $hosts)
        ) {
            return [
                'cert' => $serverCertPath,
                'key' => $serverKeyPath,
            ];
        }

        $configPath = $this->writeOpenSslConfig($this->primaryHost($hosts), $hosts);

        try {
            $serverPrivateKey = openssl_pkey_new([
                'private_key_type' => OPENSSL_KEYTYPE_RSA,
                'private_key_bits' => 2048,
                'config' => $configPath,
            ]);

            if ($serverPrivateKey === false) {
                throw new RuntimeException('Unable to generate the Snag XAMPP server private key.');
            }

            $serverCsr = openssl_csr_new([
                'commonName' => $this->primaryHost($hosts),
            ], $serverPrivateKey, [
                'config' => $configPath,
                'digest_alg' => 'sha256',
                'req_extensions' => 'req_server',
            ]);

            if ($serverCsr === false) {
                throw new RuntimeException('Unable to create the Snag XAMPP server certificate request.');
            }

            $rootCertificate = openssl_x509_read($root['cert_pem']);
            $rootPrivateKey = openssl_pkey_get_private($root['key_pem']);

            if ($rootCertificate === false || $rootPrivateKey === false) {
                throw new RuntimeException('Unable to load the Snag XAMPP root certificate for signing.');
            }

            $serverCertificate = openssl_csr_sign(
                $serverCsr,
                $rootCertificate,
                $rootPrivateKey,
                self::SERVER_DAYS_VALID,
                [
                    'config' => $configPath,
                    'digest_alg' => 'sha256',
                    'x509_extensions' => 'v3_server',
                ],
                random_int(1, PHP_INT_MAX),
            );

            if ($serverCertificate === false) {
                throw new RuntimeException('Unable to sign the Snag XAMPP server certificate.');
            }

            $serverCertPem = '';
            $serverKeyPem = '';

            openssl_x509_export($serverCertificate, $serverCertPem);
            openssl_pkey_export($serverPrivateKey, $serverKeyPem, null, [
                'config' => $configPath,
            ]);

            $this->files->put($serverCertPath, $serverCertPem.PHP_EOL.$root['cert_pem']);
            $this->files->put($serverKeyPath, $serverKeyPem);
            $this->files->put($metadataPath, json_encode([
                'hosts' => $hosts,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            return [
                'cert' => $serverCertPath,
                'key' => $serverKeyPath,
            ];
        } finally {
            $this->files->delete($configPath);
        }
    }

    private function certificateDirectory(): string
    {
        return $this->app->storagePath('app/xampp/tls');
    }

    private function certificateNeedsRenewal(string $certificatePath): bool
    {
        $parsed = $this->parseCertificate($certificatePath);

        if ($parsed === null) {
            return true;
        }

        return ((int) ($parsed['validTo_time_t'] ?? 0)) <= (time() + self::RENEWAL_WINDOW_SECONDS);
    }

    /**
     * @param  array<int, string>  $hosts
     */
    private function certificateCoversHosts(string $certificatePath, array $hosts): bool
    {
        $parsed = $this->parseCertificate($certificatePath);
        $subjectAltName = $parsed['extensions']['subjectAltName'] ?? null;

        if (! is_string($subjectAltName) || $subjectAltName === '') {
            return false;
        }

        foreach ($hosts as $host) {
            $needle = filter_var($host, FILTER_VALIDATE_IP)
                ? 'IP Address:'.$host
                : 'DNS:'.$host;

            if (! str_contains($subjectAltName, $needle)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array<int, string>  $hosts
     */
    private function serverMetadataMatches(string $metadataPath, array $hosts): bool
    {
        if (! $this->files->exists($metadataPath)) {
            return false;
        }

        $metadata = json_decode($this->files->get($metadataPath), true);

        if (! is_array($metadata) || ! isset($metadata['hosts']) || ! is_array($metadata['hosts'])) {
            return false;
        }

        $storedHosts = $metadata['hosts'];
        sort($storedHosts);

        return $storedHosts === $hosts;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function parseCertificate(string $certificatePath): ?array
    {
        if (! $this->files->exists($certificatePath)) {
            return null;
        }

        $certificate = openssl_x509_read($this->files->get($certificatePath));

        if ($certificate === false) {
            return null;
        }

        $parsed = openssl_x509_parse($certificate);

        return is_array($parsed) ? $parsed : null;
    }

    /**
     * @param  array<int, string>  $hosts
     */
    private function writeOpenSslConfig(string $commonName, array $hosts): string
    {
        $altNames = [];
        $dnsIndex = 1;
        $ipIndex = 1;

        foreach ($hosts as $host) {
            if (filter_var($host, FILTER_VALIDATE_IP)) {
                $altNames[] = sprintf('IP.%d = %s', $ipIndex, $host);
                $ipIndex += 1;

                continue;
            }

            $altNames[] = sprintf('DNS.%d = %s', $dnsIndex, $host);
            $dnsIndex += 1;
        }

        $config = implode(PHP_EOL, array_filter([
            '[ req ]',
            'default_bits = 2048',
            'prompt = no',
            'distinguished_name = dn',
            'string_mask = utf8only',
            '',
            '[ dn ]',
            'CN = '.$commonName,
            '',
            '[ v3_ca ]',
            'subjectKeyIdentifier = hash',
            'authorityKeyIdentifier = keyid:always,issuer',
            'basicConstraints = critical, CA:true',
            'keyUsage = critical, digitalSignature, cRLSign, keyCertSign',
            '',
            '[ v3_server ]',
            'subjectKeyIdentifier = hash',
            'authorityKeyIdentifier = keyid,issuer',
            'basicConstraints = critical, CA:false',
            'keyUsage = critical, digitalSignature, keyEncipherment',
            'extendedKeyUsage = serverAuth',
            $altNames === [] ? null : 'subjectAltName = @alt_names',
            '',
            '[ req_server ]',
            'basicConstraints = critical, CA:false',
            'keyUsage = critical, digitalSignature, keyEncipherment',
            'extendedKeyUsage = serverAuth',
            $altNames === [] ? null : 'subjectAltName = @alt_names',
            '',
            $altNames === [] ? null : '[ alt_names ]',
            ...$altNames,
            '',
        ]));

        $path = $this->certificateDirectory().DIRECTORY_SEPARATOR.'openssl-'.md5($config).'.cnf';
        $this->files->put($path, $config);

        return $path;
    }

    /**
     * @param  array<int, string>  $hosts
     */
    private function primaryHost(array $hosts): string
    {
        foreach ($hosts as $host) {
            if ($host !== 'localhost' && $host !== '127.0.0.1') {
                return $host;
            }
        }

        return $hosts[0] ?? 'localhost';
    }

    protected function trustRootCertificate(string $rootCertificatePath): void
    {
        if (DIRECTORY_SEPARATOR !== '\\') {
            return;
        }

        $escapedPath = str_replace("'", "''", $rootCertificatePath);
        $script = <<<POWERSHELL
\$certificate = Get-PfxCertificate -FilePath '$escapedPath'
if (-not \$certificate) { throw 'Unable to load Snag XAMPP root certificate.' }
\$existing = Get-ChildItem Cert:\\CurrentUser\\Root | Where-Object { \$_.Thumbprint -eq \$certificate.Thumbprint }
if (-not \$existing) {
    Import-Certificate -FilePath '$escapedPath' -CertStoreLocation Cert:\\CurrentUser\\Root | Out-Null
}
POWERSHELL;

        $process = new Process([
            'powershell',
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-Command',
            $script,
        ]);
        $process->setTimeout(20);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new RuntimeException(trim($process->getErrorOutput().PHP_EOL.$process->getOutput()));
        }
    }
}
