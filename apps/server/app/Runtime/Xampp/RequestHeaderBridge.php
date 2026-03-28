<?php

namespace App\Runtime\Xampp;

class RequestHeaderBridge
{
    /**
     * @param  array<string, mixed>  $server
     * @param  array<string, mixed>  $headers
     * @return array<string, mixed>
     */
    public function bridge(array $server, array $headers = []): array
    {
        return $this->promoteHeaders($server, $headers);
    }

    /**
     * @param  array<string, mixed>  $server
     * @param  array<string, mixed>  $headers
     */
    public function authorizationHeader(array $server, array $headers = []): ?string
    {
        $bridged = $this->bridge($server, $headers);
        $authorization = $bridged['HTTP_AUTHORIZATION'] ?? null;

        return is_string($authorization) && trim($authorization) !== ''
            ? trim($authorization)
            : null;
    }

    /**
     * @param  array<string, mixed>  $server
     * @param  array<string, mixed>  $headers
     */
    public function bearerToken(array $server, array $headers = []): ?string
    {
        $authorization = $this->authorizationHeader($server, $headers);

        if (! is_string($authorization) || ! preg_match('/^\s*Bearer\s+(.+)\s*$/i', $authorization, $matches)) {
            return null;
        }

        return trim($matches[1]);
    }

    /**
     * @param  array<string, mixed>  $server
     * @param  array<string, mixed>  $headers
     * @return array<string, mixed>
     */
    private function promoteHeaders(array $server, array $headers): array
    {
        if (! $this->hasValue($server, 'HTTP_AUTHORIZATION')) {
            $authorization = $this->findValue($server, $headers, ['authorization']);

            if ($authorization !== null) {
                $server['HTTP_AUTHORIZATION'] = $authorization;
            }
        }

        if (! $this->hasValue($server, 'HTTP_X_XSRF_TOKEN')) {
            $xsrfToken = $this->findValue($server, $headers, ['x_xsrf_token', 'x-xsrf-token']);

            if ($xsrfToken !== null) {
                $server['HTTP_X_XSRF_TOKEN'] = $xsrfToken;
            }
        }

        return $server;
    }

    /**
     * @param  array<string, mixed>  $values
     */
    private function hasValue(array $values, string $key): bool
    {
        return isset($values[$key]) && is_string($values[$key]) && trim($values[$key]) !== '';
    }

    /**
     * @param  array<string, mixed>  $server
     * @param  array<string, mixed>  $headers
     * @param  list<string>  $needles
     */
    private function findValue(array $server, array $headers, array $needles): ?string
    {
        foreach ([$server, $headers] as $source) {
            foreach ($source as $key => $value) {
                if (! is_string($key) || ! is_string($value) || trim($value) === '') {
                    continue;
                }

                $normalizedKey = strtolower(str_replace('-', '_', $key));

                foreach ($needles as $needle) {
                    $normalizedNeedle = strtolower(str_replace('-', '_', $needle));

                    if (str_contains($normalizedKey, $normalizedNeedle)) {
                        return $value;
                    }
                }
            }
        }

        return null;
    }
}
