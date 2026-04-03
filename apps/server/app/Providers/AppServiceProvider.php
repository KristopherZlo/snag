<?php

namespace App\Providers;

use App\Models\BugIssue;
use App\Models\BugReport;
use App\Models\CaptureKey;
use App\Models\Organization;
use App\Models\OrganizationIntegration;
use App\Models\WebsiteWidget;
use App\Policies\BugIssuePolicy;
use App\Policies\BugReportPolicy;
use App\Policies\CaptureKeyPolicy;
use App\Policies\OrganizationPolicy;
use App\Policies\OrganizationIntegrationPolicy;
use App\Policies\WebsiteWidgetPolicy;
use App\Runtime\Xampp\RequestHeaderBridge;
use Illuminate\Http\Request;
use Illuminate\Routing\UrlGenerator;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        Sanctum::getAccessTokenFromRequestUsing(function ($request): ?string {
            $bridge = $this->app->make(RequestHeaderBridge::class);
            $fallbackToken = $bridge->bearerToken(
                $_SERVER,
                function_exists('getallheaders') ? (array) getallheaders() : [],
            );

            return $request->bearerToken() ?: $fallbackToken;
        });

        Gate::policy(Organization::class, OrganizationPolicy::class);
        Gate::policy(BugIssue::class, BugIssuePolicy::class);
        Gate::policy(BugReport::class, BugReportPolicy::class);
        Gate::policy(CaptureKey::class, CaptureKeyPolicy::class);
        Gate::policy(OrganizationIntegration::class, OrganizationIntegrationPolicy::class);
        Gate::policy(WebsiteWidget::class, WebsiteWidgetPolicy::class);

        $this->configureLocalTemporaryStorageUrls();
    }

    private function configureLocalTemporaryStorageUrls(): void
    {
        $disk = (string) config('snag.storage.artifact_disk', config('filesystems.default', 'local'));
        $driver = (string) config("filesystems.disks.{$disk}.driver", '');

        if ($driver !== 'local') {
            return;
        }

        $buildSignedStorageUrl = fn (string $routeName, \DateTimeInterface $expiration, array $parameters): string => $this->buildLocalSignedStorageUrl(
            $routeName,
            $expiration,
            $parameters,
        );

        Storage::disk($disk)->buildTemporaryUrlsUsing(
            fn (string $path, \DateTimeInterface $expiration): string => $buildSignedStorageUrl(
                "storage.{$disk}",
                $expiration,
                ['path' => $path],
            ),
        );

        Storage::disk($disk)->buildTemporaryUploadUrlsUsing(
            fn (string $path, \DateTimeInterface $expiration): array => [
                'url' => $buildSignedStorageUrl(
                    "storage.{$disk}.upload",
                    $expiration,
                    ['path' => $path, 'upload' => true],
                ),
                'headers' => [],
            ],
        );
    }

    /**
     * Generate a local signed storage URL that stays valid under a base path like `/snag`.
     */
    private function buildLocalSignedStorageUrl(
        string $routeName,
        \DateTimeInterface $expiration,
        array $parameters
    ): string {
        $url = $this->basePathAwareUrlGenerator();
        $relativeSignedPath = $url->temporarySignedRoute(
            $routeName,
            $expiration,
            $parameters,
            absolute: false,
        );

        return $url->to($relativeSignedPath);
    }

    private function basePathAwareUrlGenerator(): UrlGenerator
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
