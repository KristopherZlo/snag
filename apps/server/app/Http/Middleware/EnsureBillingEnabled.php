<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureBillingEnabled
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('snag.billing.enabled') || ! config('snag.billing.stripe.secret_key')) {
            abort(409, 'billing_disabled');
        }

        return $next($request);
    }
}
