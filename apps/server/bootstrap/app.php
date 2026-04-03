<?php

use App\Http\Middleware\EnsureActiveOrganization;
use App\Http\Middleware\EnsureBillingEnabled;
use App\Http\Middleware\EnsureCaptureToken;
use App\Http\Middleware\EnsureTokenAbilities;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ThrottlePublicCaptureRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->validateCsrfTokens(except: [
            'api/v1/public/capture/*',
        ]);

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'active.organization' => EnsureActiveOrganization::class,
            'capture.token' => EnsureCaptureToken::class,
            'billing.enabled' => EnsureBillingEnabled::class,
            'public.capture.throttle' => ThrottlePublicCaptureRequests::class,
            'token.abilities' => EnsureTokenAbilities::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
