<?php

namespace Tests\Unit\Runtime;

use App\Runtime\Xampp\XamppTlsCertificateManager;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Filesystem\Filesystem;
use Mockery;
use Mockery\Adapter\Phpunit\MockeryPHPUnitIntegration;
use PHPUnit\Framework\TestCase;

class XamppTlsCertificateManagerTest extends TestCase
{
    use MockeryPHPUnitIntegration;

    private ?string $temporaryStoragePath = null;

    protected function tearDown(): void
    {
        if ($this->temporaryStoragePath !== null) {
            (new Filesystem())->deleteDirectory($this->temporaryStoragePath);
        }

        parent::tearDown();
    }

    public function test_it_generates_a_server_certificate_with_requested_hosts(): void
    {
        $manager = $this->makeManager();

        $certificate = $manager->ensureCertificateForHosts(['192.168.43.122']);

        $this->assertNotNull($certificate);
        $this->assertFileExists($certificate['cert']);
        $this->assertFileExists($certificate['key']);

        $parsed = openssl_x509_parse(openssl_x509_read(file_get_contents($certificate['cert']) ?: ''));

        $this->assertIsArray($parsed);
        $this->assertSame('CA:FALSE', $parsed['extensions']['basicConstraints'] ?? null);
        $this->assertSame('TLS Web Server Authentication', $parsed['extensions']['extendedKeyUsage'] ?? null);
        $this->assertStringContainsString('IP Address:192.168.43.122', $parsed['extensions']['subjectAltName'] ?? '');
        $this->assertStringContainsString('DNS:localhost', $parsed['extensions']['subjectAltName'] ?? '');
    }

    public function test_it_reuses_the_existing_certificate_when_hosts_do_not_change(): void
    {
        $manager = $this->makeManager();

        $first = $manager->ensureCertificateForHosts(['192.168.43.122']);
        $second = $manager->ensureCertificateForHosts(['localhost', '192.168.43.122']);

        $this->assertNotNull($first);
        $this->assertNotNull($second);
        $this->assertSame(file_get_contents($first['cert']), file_get_contents($second['cert']));
        $this->assertSame(file_get_contents($first['key']), file_get_contents($second['key']));
    }

    private function makeManager(): XamppTlsCertificateManager
    {
        $filesystem = new Filesystem;
        $this->temporaryStoragePath = sys_get_temp_dir().DIRECTORY_SEPARATOR.'snag-xampp-tls-'.bin2hex(random_bytes(5));
        $tlsPath = $this->temporaryStoragePath.DIRECTORY_SEPARATOR.'app'.DIRECTORY_SEPARATOR.'xampp'.DIRECTORY_SEPARATOR.'tls';

        $app = Mockery::mock(Application::class);
        $app->shouldReceive('storagePath')
            ->with('app/xampp/tls')
            ->andReturn($tlsPath);

        return new class($app, $filesystem) extends XamppTlsCertificateManager
        {
            protected function trustRootCertificate(string $rootCertificatePath): void
            {
                // Trust-store side effects are outside the scope of this unit test.
            }
        };
    }
}
