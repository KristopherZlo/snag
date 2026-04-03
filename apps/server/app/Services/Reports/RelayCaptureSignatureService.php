<?php

namespace App\Services\Reports;

use App\Models\CaptureKey;
use Illuminate\Validation\ValidationException;

class RelayCaptureSignatureService
{
    public function validate(
        CaptureKey $captureKey,
        string $origin,
        string $action,
        ?string $timestamp,
        ?string $signature,
    ): void {
        if (blank($captureKey->relay_secret) || blank($timestamp) || blank($signature)) {
            $this->invalid();
        }

        if (! ctype_digit($timestamp)) {
            $this->invalid();
        }

        if (abs(now()->timestamp - (int) $timestamp) > 300) {
            $this->invalid('capture_signature_expired');
        }

        $expected = 'sha256='.hash_hmac(
            'sha256',
            $this->payload($captureKey->public_key, $origin, $action, $timestamp),
            (string) $captureKey->relay_secret,
        );

        if (! hash_equals($expected, (string) $signature)) {
            $this->invalid();
        }
    }

    public function payload(string $publicKey, string $origin, string $action, string|int $timestamp): string
    {
        return implode('.', [$timestamp, $publicKey, $origin, $action]);
    }

    private function invalid(string $message = 'invalid_capture_signature'): never
    {
        throw ValidationException::withMessages([
            'relay_signature' => $message,
        ]);
    }
}
