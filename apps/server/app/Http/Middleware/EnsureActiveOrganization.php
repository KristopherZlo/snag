<?php

namespace App\Http\Middleware;

use App\Support\CurrentOrganization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveOrganization
{
    public function __construct(private readonly CurrentOrganization $currentOrganization) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            $organization = $this->currentOrganization->resolve($user);

            if (! $organization) {
                if ($request->expectsJson()) {
                    abort(409, 'organization_required');
                }

                return redirect()->route('onboarding.organization');
            }

            $request->attributes->set('organization', $organization);
        }

        return $next($request);
    }
}
