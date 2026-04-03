<?php

namespace App\Support;

final class ShareUrlSummary
{
    public static function summarize(?string $url): ?string
    {
        if (! is_string($url) || trim($url) === '') {
            return null;
        }

        $parts = parse_url($url);

        if ($parts === false) {
            return null;
        }

        $host = $parts['host'] ?? null;
        $path = $parts['path'] ?? '/';
        $port = $parts['port'] ?? null;

        if ($path === '') {
            $path = '/';
        }

        if ($host === null) {
            return $path;
        }

        $authority = strtolower($host);

        if (is_int($port)) {
            $authority .= ':'.$port;
        }

        return $authority.$path;
    }
}
