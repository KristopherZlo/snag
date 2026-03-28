<?php

namespace App\Http\Middleware;

use App\Enums\CaptureKeyStatus;
use App\Models\CaptureKey;
use App\Services\Reports\CaptureTokenService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCaptureToken
{
    public function __construct(private readonly CaptureTokenService $captureTokens) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $captureKey = CaptureKey::query()
            ->where('public_key', $request->string('public_key'))
            ->firstOrFail();

        if ($captureKey->status !== CaptureKeyStatus::Active) {
            abort(403, 'invalid_capture_token');
        }

        $origin = $request->string('origin')->toString();

        if (! in_array($origin, $captureKey->allowed_origins ?? [], true)) {
            abort(403, 'forbidden_origin');
        }

        $action = str_contains((string) $request->route()?->getName(), 'finalize') ? 'finalize' : 'create';

        $this->captureTokens->consume(
            $request->string('capture_token')->toString(),
            $captureKey->public_key,
            $origin,
            $action
        );

        $request->attributes->set('captureKey', $captureKey);

        return $next($request);
    }
}
