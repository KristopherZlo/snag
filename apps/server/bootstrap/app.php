<?php

use App\Http\Middleware\EnsureActiveOrganization;
use App\Http\Middleware\EnsureBillingEnabled;
use App\Http\Middleware\EnsureCaptureToken;
use App\Http\Middleware\EnsureTokenAbilities;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetApplicationLocale;
use App\Http\Middleware\ThrottleExtensionExchangeRequests;
use App\Http\Middleware\ThrottlePublicCaptureRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

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
            SetApplicationLocale::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'active.organization' => EnsureActiveOrganization::class,
            'capture.token' => EnsureCaptureToken::class,
            'billing.enabled' => EnsureBillingEnabled::class,
            'extension.exchange.throttle' => ThrottleExtensionExchangeRequests::class,
            'public.capture.throttle' => ThrottlePublicCaptureRequests::class,
            'token.abilities' => EnsureTokenAbilities::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->respond(function (SymfonyResponse $response, Throwable $exception, Request $request) {
            $status = $response->getStatusCode();

            if ($request->expectsJson() || $request->is('api/*')) {
                return $response;
            }

            if ($status === 419) {
                return back()->with('status', 'The page expired. Please try again.');
            }

            if (! in_array($status, [403, 404, 429, 500, 503], true)) {
                return $response;
            }

            if (app()->environment('local') && in_array($status, [500, 503], true)) {
                return $response;
            }

            return Inertia::render('Error', [
                'status' => $status,
            ])->toResponse($request)->setStatusCode($status);
        });
    })->create();
