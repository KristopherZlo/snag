<?php

namespace App\Providers;

use App\Runtime\Xampp\XamppBrowserRuntimeConfigResolver;
use App\Runtime\Xampp\XamppRuntimeConfigRepository;
use App\Runtime\Xampp\XamppRuntimeFallbackFactory;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class XamppRuntimeServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(XamppBrowserRuntimeConfigResolver::class);
        $this->app->singleton(XamppRuntimeConfigRepository::class);
        $this->app->singleton(XamppRuntimeFallbackFactory::class);

        if ($this->app->runningUnitTests()) {
            return;
        }

        $overrides = $this->runtimeOverrides();

        if ($overrides !== []) {
            config($overrides);
        }
    }

    public function boot(): void
    {
        if ($this->app->runningUnitTests()) {
            return;
        }

        $overrides = $this->runtimeOverrides();

        $rootUrl = $overrides['app.url'] ?? null;

        if (! is_string($rootUrl) || $rootUrl === '') {
            return;
        }

        URL::forceRootUrl($rootUrl);

        $scheme = parse_url($rootUrl, PHP_URL_SCHEME);

        if (is_string($scheme) && $scheme !== '') {
            URL::forceScheme($scheme);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function runtimeOverrides(): array
    {
        $runtimeConfig = $this->app->make(XamppRuntimeConfigRepository::class);
        $overrides = $runtimeConfig->read();

        if ($overrides === []) {
            $fallbackProfile = $this->app->make(XamppRuntimeFallbackFactory::class)->fromServer($_SERVER);

            if ($fallbackProfile !== null) {
                $overrides = $fallbackProfile->configOverrides();
            }
        }

        /** @var XamppBrowserRuntimeConfigResolver $resolver */
        $resolver = $this->app->make(XamppBrowserRuntimeConfigResolver::class);

        return $resolver->normalize(
            $overrides,
            $this->app->bound('request') ? $this->app->make('request') : null,
            $this->app->runningInConsole(),
        );
    }
}
