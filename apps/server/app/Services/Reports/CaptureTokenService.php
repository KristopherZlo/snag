<?php

namespace App\Services\Reports;

use App\Models\CaptureKey;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CaptureTokenService
{
    public function issue(CaptureKey $captureKey, string $origin, string $action, string $mode = 'browser'): string
    {
        $payload = [
            'public_key' => $captureKey->public_key,
            'origin' => $origin,
            'action' => $action,
            'mode' => $mode,
            'exp' => now()->addMinutes((int) config('snag.capture.public_finalize_ttl_minutes'))->timestamp,
            'nonce' => Str::random(32),
        ];

        $encoded = $this->base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR));
        $signature = hash_hmac('sha256', $encoded, config('app.key'));

        return $encoded.'.'.$signature;
    }

    public function consume(string $token, string $expectedKey, string $origin, string $action, string $mode = 'browser'): array
    {
        [$encoded, $signature] = explode('.', $token, 2) + [null, null];

        if (! $encoded || ! $signature) {
            $this->invalid();
        }

        $expectedSignature = hash_hmac('sha256', $encoded, config('app.key'));

        if (! hash_equals($expectedSignature, $signature)) {
            $this->invalid();
        }

        $payload = json_decode($this->base64UrlDecode($encoded), true, flags: JSON_THROW_ON_ERROR);

        if (
            ($payload['public_key'] ?? null) !== $expectedKey
            || ($payload['origin'] ?? null) !== $origin
            || ($payload['action'] ?? null) !== $action
            || ($payload['mode'] ?? 'browser') !== $mode
        ) {
            $this->invalid();
        }

        if (($payload['exp'] ?? 0) < now()->timestamp) {
            $this->invalid('upload_session_expired');
        }

        $cacheKey = 'capture-token:'.hash('sha256', $token);

        if (! Cache::add($cacheKey, true, max(1, $payload['exp'] - now()->timestamp))) {
            $this->invalid('invalid_capture_token');
        }

        return $payload;
    }

    private function invalid(string $message = 'invalid_capture_token'): never
    {
        throw ValidationException::withMessages([
            'capture_token' => $message,
        ]);
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string
    {
        return base64_decode(strtr($value, '-_', '+/'));
    }
}
