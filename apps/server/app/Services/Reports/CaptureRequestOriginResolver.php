<?php

namespace App\Services\Reports;

use Illuminate\Http\Request;

class CaptureRequestOriginResolver
{
    public function resolveBrowserOrigin(Request $request): ?string
    {
        $origin = trim((string) $request->header('Origin'));

        if ($origin !== '') {
            return $origin;
        }

        $referer = trim((string) $request->header('Referer'));

        if ($referer === '') {
            return null;
        }

        $parsed = parse_url($referer);

        if (! is_array($parsed) || blank($parsed['scheme'] ?? null) || blank($parsed['host'] ?? null)) {
            return null;
        }

        $origin = "{$parsed['scheme']}://{$parsed['host']}";

        if (filled($parsed['port'] ?? null)) {
            $origin .= ':'.$parsed['port'];
        }

        return $origin;
    }
}
