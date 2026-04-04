<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class ThrottleExtensionExchangeRequests
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $maxAttempts = max(1, (int) config('snag.capture.extension_exchange.max_attempts', 5));
        $decaySeconds = max(1, (int) config('snag.capture.extension_exchange.decay_seconds', 60));
        $key = implode(':', [
            'extension-exchange',
            $request->ip() ?: 'unknown',
        ]);

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            abort(Response::HTTP_TOO_MANY_REQUESTS, 'extension_exchange_rate_limited');
        }

        $response = $next($request);

        if ($response->getStatusCode() >= Response::HTTP_BAD_REQUEST) {
            RateLimiter::hit($key, $decaySeconds);

            return $response;
        }

        RateLimiter::clear($key);

        return $response;
    }
}
