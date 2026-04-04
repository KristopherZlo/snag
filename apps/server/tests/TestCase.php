<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Routing\UrlGenerator;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->configureTestingFilesystems();
    }

    protected function tearDown(): void
    {
        Storage::forgetDisk('local');
        Storage::forgetDisk('public');

        parent::tearDown();
    }

    private function configureTestingFilesystems(): void
    {
        $localRoot = storage_path('framework/testing/disks/local');
        $publicRoot = storage_path('framework/testing/disks/public');

        File::deleteDirectory($localRoot);
        File::deleteDirectory($publicRoot);
        File::ensureDirectoryExists($localRoot);
        File::ensureDirectoryExists($publicRoot);

        config([
            'filesystems.default' => 'local',
            'filesystems.disks.local.root' => $localRoot,
            'filesystems.disks.public.root' => $publicRoot,
            'snag.storage.artifact_disk' => 'local',
        ]);

        Storage::forgetDisk('local');
        Storage::forgetDisk('public');
        $this->configureTestingLocalTemporaryStorageUrls();
    }

    private function configureTestingLocalTemporaryStorageUrls(): void
    {
        $buildSignedStorageUrl = fn (string $routeName, \DateTimeInterface $expiration, array $parameters): string => $this->buildTestingLocalSignedStorageUrl(
            $routeName,
            $expiration,
            $parameters,
        );

        Storage::disk('local')->buildTemporaryUrlsUsing(
            fn (string $path, \DateTimeInterface $expiration): string => $buildSignedStorageUrl(
                'storage.local',
                $expiration,
                ['path' => $path],
            ),
        );

        Storage::disk('local')->buildTemporaryUploadUrlsUsing(
            fn (string $path, \DateTimeInterface $expiration): array => [
                'url' => $buildSignedStorageUrl(
                    'storage.local.upload',
                    $expiration,
                    ['path' => $path, 'upload' => true],
                ),
                'headers' => [],
            ],
        );
    }

    private function buildTestingLocalSignedStorageUrl(
        string $routeName,
        \DateTimeInterface $expiration,
        array $parameters
    ): string {
        $url = $this->testingBasePathAwareUrlGenerator();
        $relativeSignedPath = $url->temporarySignedRoute(
            $routeName,
            $expiration,
            $parameters,
            absolute: false,
        );

        return $url->to($relativeSignedPath);
    }

    private function testingBasePathAwareUrlGenerator(): UrlGenerator
    {
        $basePath = trim((string) parse_url((string) config('app.url'), PHP_URL_PATH), '/');
        /** @var UrlGenerator $url */
        $url = clone $this->app->make('url');

        if ($basePath === '') {
            return $url;
        }

        $appUrl = rtrim((string) config('app.url'), '/');
        $scheme = (string) parse_url($appUrl, PHP_URL_SCHEME) ?: 'http';
        $host = (string) parse_url($appUrl, PHP_URL_HOST) ?: 'localhost';
        $port = (int) (parse_url($appUrl, PHP_URL_PORT) ?: ($scheme === 'https' ? 443 : 80));
        $basePrefix = '/'.$basePath;
        $probePath = $basePrefix.'/__storage_probe';

        $url->setRequest(Request::create(
            $appUrl.'/__storage_probe',
            'GET',
            [],
            [],
            [],
            [
                'SCRIPT_NAME' => $basePrefix.'/index.php',
                'SCRIPT_FILENAME' => dirname(base_path(), 2).DIRECTORY_SEPARATOR.'index.php',
                'PHP_SELF' => $basePrefix.'/index.php',
                'REQUEST_URI' => $probePath,
                'QUERY_STRING' => '',
                'HTTP_HOST' => $host,
                'SERVER_NAME' => $host,
                'SERVER_PORT' => $port,
                'REQUEST_SCHEME' => $scheme,
                'HTTPS' => $scheme === 'https' ? 'on' : 'off',
            ],
        ));

        return $url;
    }
}
