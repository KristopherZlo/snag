<?php

namespace App\Providers;

use App\Models\BugReport;
use App\Models\CaptureKey;
use App\Models\Organization;
use App\Policies\BugReportPolicy;
use App\Policies\CaptureKeyPolicy;
use App\Policies\OrganizationPolicy;
use App\Runtime\Xampp\RequestHeaderBridge;
use Illuminate\Support\Facades\Gate;
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
        Gate::policy(BugReport::class, BugReportPolicy::class);
        Gate::policy(CaptureKey::class, CaptureKeyPolicy::class);
    }
}
