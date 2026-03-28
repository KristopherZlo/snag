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

        return is_array($requests) ? array_values(array_filter($requests, 'is_array')) : [];
    }
}
