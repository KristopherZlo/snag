<?php

namespace App\Services\Reports;

class DebuggerPayloadSanitizer
{
    private const REDACTED = '[redacted]';

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function sanitizePayload(array $payload): array
    {
        if (isset($payload['context']) && is_array($payload['context'])) {
            $payload['context'] = $this->sanitizeContext($payload['context']);
        }

        if (isset($payload['meta']) && is_array($payload['meta'])) {
            $payload['meta'] = $this->sanitizeArray($payload['meta']);
        }

        if (isset($payload['actions']) && is_array($payload['actions'])) {
            $payload['actions'] = array_values(array_map(
                fn (mixed $action): mixed => is_array($action) ? $this->sanitizeAction($action) : $action,
                $payload['actions'],
            ));
        }

        if (isset($payload['logs']) && is_array($payload['logs'])) {
            $payload['logs'] = array_values(array_map(
                fn (mixed $log): mixed => is_array($log) ? $this->sanitizeLog($log) : $log,
                $payload['logs'],
            ));
        }

        foreach (['network_requests', 'networkRequests'] as $key) {
            if (! isset($payload[$key]) || ! is_array($payload[$key])) {
                continue;
            }

            $payload[$key] = array_values(array_map(
                fn (mixed $request): mixed => is_array($request) ? $this->sanitizeNetworkRequest($request) : $request,
                $payload[$key],
            ));
        }

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $meta
     * @return array<string, mixed>
     */
    public function sanitizeLooseMeta(array $meta): array
    {
        return $this->sanitizeArray($meta);
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private function sanitizeContext(array $context): array
    {
        $context = $this->sanitizeArray($context);

        unset($context['selection']);

        if (isset($context['url']) && is_string($context['url'])) {
            $context['url'] = $this->sanitizeString($context['url']);
        }

        if (isset($context['referrer']) && is_string($context['referrer'])) {
            $context['referrer'] = $this->sanitizeString($context['referrer']);
        }

        return $context;
    }

    /**
     * @param  array<string, mixed>  $action
     * @return array<string, mixed>
     */
    private function sanitizeAction(array $action): array
    {
        $action = $this->sanitizeArray($action);

        if (($action['type'] ?? null) === 'input') {
            $action['value'] = null;
        } elseif (isset($action['value']) && is_string($action['value'])) {
            $action['value'] = $this->sanitizeString($action['value']);
        }

        return $action;
    }

    /**
     * @param  array<string, mixed>  $log
     * @return array<string, mixed>
     */
    private function sanitizeLog(array $log): array
    {
        $log = $this->sanitizeArray($log);

        if (isset($log['message']) && is_string($log['message'])) {
            $log['message'] = $this->sanitizeString($log['message']);
        }

        return $log;
    }

    /**
     * @param  array<string, mixed>  $request
     * @return array<string, mixed>
     */
    private function sanitizeNetworkRequest(array $request): array
    {
        $request = $this->sanitizeArray($request);

        if (isset($request['url']) && is_string($request['url'])) {
            $request['url'] = $this->sanitizeString($request['url']);
        }

        if (isset($request['request_headers']) && is_array($request['request_headers'])) {
            $request['request_headers'] = $this->sanitizeStringMap($request['request_headers']);
        }

        if (isset($request['response_headers']) && is_array($request['response_headers'])) {
            $request['response_headers'] = $this->sanitizeStringMap($request['response_headers']);
        }

        return $request;
    }

    /**
     * @param  array<string, mixed>  $value
     * @return array<string, mixed>
     */
    private function sanitizeArray(array $value): array
    {
        $sanitized = [];

        foreach ($value as $key => $entry) {
            $keyString = (string) $key;

            if ($this->shouldRedactKey($keyString)) {
                $sanitized[$key] = self::REDACTED;
                continue;
            }

            if (is_string($entry)) {
                $sanitized[$key] = $this->sanitizeString($entry);
                continue;
            }

            if (is_array($entry)) {
                $sanitized[$key] = $this->sanitizeArray($entry);
                continue;
            }

            $sanitized[$key] = $entry;
        }

        return $sanitized;
    }

    /**
     * @param  array<string, mixed>  $headers
     * @return array<string, string>
     */
    private function sanitizeStringMap(array $headers): array
    {
        $sanitized = [];

        foreach ($headers as $key => $value) {
            if (! is_string($value)) {
                continue;
            }

            $sanitized[(string) $key] = $this->shouldRedactKey((string) $key)
                ? self::REDACTED
                : $this->sanitizeString($value);
        }

        return $sanitized;
    }

    private function sanitizeString(string $value): string
    {
        $source = $this->sanitizeUrl($value) ?? $value;
        $source = preg_replace('/\bBearer\s+[A-Za-z0-9\-._~+\/]+=*\b/i', 'Bearer '.self::REDACTED, $source) ?? $source;
        $source = preg_replace('/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/', self::REDACTED, $source) ?? $source;

        return preg_replace_callback(
            '/\b[A-Za-z0-9_-]{24,}\b/',
            fn (array $matches): string => $this->isLikelyOpaqueToken($matches[0]) ? self::REDACTED : $matches[0],
            $source,
        ) ?? $source;
    }

    private function sanitizeUrl(string $value): ?string
    {
        $parts = parse_url($value);

        if ($parts === false || ! isset($parts['scheme'], $parts['host'])) {
            return null;
        }

        if (! isset($parts['query']) || $parts['query'] === '') {
            return $value;
        }

        parse_str($parts['query'], $query);

        if (! is_array($query)) {
            return $value;
        }

        foreach ($query as $key => $entry) {
            if (is_array($entry)) {
                $query[$key] = $this->sanitizeArray($entry);
                continue;
            }

            if (! is_string($entry)) {
                continue;
            }

            if ($this->shouldRedactKey((string) $key) || $this->isLikelyOpaqueToken($entry) || preg_match('/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/', $entry)) {
                $query[$key] = self::REDACTED;
            }
        }

        $parts['query'] = http_build_query($query, '', '&', PHP_QUERY_RFC3986);

        return $this->buildUrl($parts);
    }

    private function shouldRedactKey(string $key): bool
    {
        return (bool) preg_match('/authorization|cookie|set-cookie|token|secret|password|passwd|pwd|session|api[-_]?key|auth|csrf|xsrf|otp|passcode|verification[-_]?code|auth[-_]?code|reset[-_]?code/i', $key);
    }

    private function isLikelyOpaqueToken(string $value): bool
    {
        return strlen($value) >= 24
            && (bool) preg_match('/^[A-Za-z0-9_-]+$/', $value)
            && (bool) preg_match('/[A-Za-z]/', $value)
            && (bool) preg_match('/\d/', $value);
    }

    /**
     * @param  array<string, mixed>  $parts
     */
    private function buildUrl(array $parts): string
    {
        $scheme = $parts['scheme'].'://';
        $user = $parts['user'] ?? '';
        $pass = isset($parts['pass']) ? ':'.$parts['pass'] : '';
        $auth = $user !== '' ? "{$user}{$pass}@" : '';
        $host = $parts['host'] ?? '';
        $port = isset($parts['port']) ? ':'.$parts['port'] : '';
        $path = $parts['path'] ?? '';
        $query = isset($parts['query']) && $parts['query'] !== '' ? '?'.$parts['query'] : '';
        $fragment = isset($parts['fragment']) ? '#'.$parts['fragment'] : '';

        return "{$scheme}{$auth}{$host}{$port}{$path}{$query}{$fragment}";
    }
}
