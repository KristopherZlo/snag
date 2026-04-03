<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class EnsureTokenAbilities
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$abilities): Response
    {
        $user = $request->user();

        if ($user === null || $abilities === []) {
            return $next($request);
        }

        $token = $user->currentAccessToken();
        $bearerToken = $request->bearerToken();

        if ($token === null && is_string($bearerToken) && trim($bearerToken) !== '') {
            $token = PersonalAccessToken::findToken($bearerToken);

            if (
                $token === null
                || $token->tokenable_type !== $user->getMorphClass()
                || (int) $token->tokenable_id !== (int) $user->getKey()
            ) {
                abort(403, 'token_ability_denied');
            }
        }

        if ($token === null) {
            return $next($request);
        }

        foreach ($abilities as $ability) {
            if (! $token->can($ability)) {
                abort(403, 'token_ability_denied');
            }
        }

        return $next($request);
    }
}
