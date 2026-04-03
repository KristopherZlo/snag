<?php

namespace App\Http\Middleware;

use App\Enums\CaptureKeyStatus;
use App\Models\CaptureKey;
use App\Services\Reports\CaptureRequestOriginResolver;
use App\Services\Reports\CaptureTokenService;
use App\Services\Reports\RelayCaptureSignatureService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCaptureToken
{
    public function __construct(
        private readonly CaptureTokenService $captureTokens,
        private readonly CaptureRequestOriginResolver $origins,
        private readonly RelayCaptureSignatureService $relaySignatures,
    ) {}

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

        $mode = $request->string('mode')->toString() ?: 'browser';
        $origin = $mode === 'relay'
            ? $request->string('origin')->toString()
            : (string) $this->origins->resolveBrowserOrigin($request);
        $requestOrigin = $request->string('origin')->toString();

        if ($mode === 'browser' && ($origin === '' || $requestOrigin !== $origin)) {
            abort(403, 'forbidden_origin');
        }

        if ($mode === 'relay') {
            $this->relaySignatures->validate(
                $captureKey,
                $origin,
                str_contains((string) $request->route()?->getName(), 'finalize') ? 'finalize' : 'create',
                $request->header('X-Snag-Relay-Timestamp'),
                $request->header('X-Snag-Relay-Signature'),
            );
        }

        if (! in_array($origin, $captureKey->allowed_origins ?? [], true)) {
            abort(403, 'forbidden_origin');
        }

        $action = str_contains((string) $request->route()?->getName(), 'finalize') ? 'finalize' : 'create';
        $request->merge(['origin' => $origin, 'mode' => $mode]);

        $this->captureTokens->consume(
            $request->string('capture_token')->toString(),
            $captureKey->public_key,
            $origin,
            $action,
            $mode,
        );

        $request->attributes->set('captureKey', $captureKey);

        return $next($request);
    }
}
