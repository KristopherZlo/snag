<?php

namespace App\Services\Reports;

class DebuggerPayloadNormalizer
{
    /**
     * @param  array<string, mixed>  $payload
     * @return array<int, array<string, mixed>>
     */
    public function actions(array $payload): array
    {
        $actions = $payload['actions'] ?? [];

        return is_array($actions) ? array_values(array_filter($actions, 'is_array')) : [];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>|null
     */
    public function context(array $payload): ?array
    {
        $context = $payload['context'] ?? $payload['meta']['page_context'] ?? null;

        return is_array($context) ? $context : null;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<int, array<string, mixed>>
     */
    public function logs(array $payload): array
    {
        $logs = $payload['logs'] ?? [];

        return is_array($logs) ? array_values(array_filter($logs, 'is_array')) : [];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function meta(array $payload): array
    {
        $meta = $payload['meta'] ?? [];

        return is_array($meta) ? $meta : [];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<int, array<string, mixed>>
     */
    public function networkRequests(array $payload): array
    {
        $requests = $payload['network_requests'] ?? $payload['networkRequests'] ?? [];

        if (! is_array($requests)) {
            return [];
        }

        return array_values(array_map(
            fn (array $request): array => $this->normalizeNetworkRequest($request),
            array_filter($requests, 'is_array'),
        ));
    }

    /**
     * @param  array<string, mixed>  $request
     * @return array<string, mixed>
     */
    private function normalizeNetworkRequest(array $request): array
    {
        return [
            ...$request,
            'status_code' => $this->nullableInt($request['status_code'] ?? $request['status'] ?? null),
            'duration_ms' => $this->nullableInt($request['duration_ms'] ?? null),
            'request_headers' => is_array($request['request_headers'] ?? null) ? $request['request_headers'] : [],
            'response_headers' => is_array($request['response_headers'] ?? null) ? $request['response_headers'] : [],
            'meta' => is_array($request['meta'] ?? null) ? $request['meta'] : [],
        ];
    }

    private function nullableInt(mixed $value): ?int
    {
        if (is_int($value)) {
            return $value;
        }

        if (is_float($value)) {
            return (int) round($value);
        }

        if (is_string($value)) {
            $trimmed = trim($value);

            if ($trimmed === '' || ! preg_match('/^-?\d+$/', $trimmed)) {
                return null;
            }

            return (int) $trimmed;
        }

        return null;
    }
}
