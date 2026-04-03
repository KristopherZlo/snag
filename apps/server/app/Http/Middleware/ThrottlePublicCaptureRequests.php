<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class ThrottlePublicCaptureRequests
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $bucket = $this->bucketFor($request);
        $limit = config("snag.capture.public.rate_limits.{$bucket}", []);
        $maxAttempts = max(1, (int) ($limit['max_attempts'] ?? 1));
        $decaySeconds = max(1, (int) ($limit['decay_seconds'] ?? 60));
        $key = implode(':', [
            'public-capture',
            $bucket,
            $request->ip() ?: 'unknown',
            hash('sha256', $request->string('public_key')->toString() ?: 'unknown'),
        ]);

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            abort(Response::HTTP_TOO_MANY_REQUESTS, 'public_capture_rate_limited');
        }

        RateLimiter::hit($key, $decaySeconds);

        return $next($request);
    }

    private function bucketFor(Request $request): string
    {
        $routeName = (string) $request->route()?->getName();

        return match (true) {
            str_contains($routeName, '.create') => 'create',
            str_contains($routeName, '.finalize') => 'finalize',
            default => 'token',
        };
    }
}
