<?php

namespace Tests\Unit\Reports;

use App\Services\Reports\DebuggerPayloadNormalizer;
use PHPUnit\Framework\TestCase;

class DebuggerPayloadNormalizerTest extends TestCase
{
    public function test_network_requests_coerce_non_numeric_status_codes_to_null(): void
    {
        $normalizer = new DebuggerPayloadNormalizer();

        $requests = $normalizer->networkRequests([
            'network_requests' => [[
                'method' => 'PUT',
                'url' => 'https://example.test/debugger.json',
                'status_code' => '[redacted]',
                'duration_ms' => '260',
                'request_headers' => 'invalid',
                'response_headers' => 'invalid',
                'meta' => 'invalid',
            ]],
        ]);

        $this->assertCount(1, $requests);
        $this->assertNull($requests[0]['status_code']);
        $this->assertSame(260, $requests[0]['duration_ms']);
        $this->assertSame([], $requests[0]['request_headers']);
        $this->assertSame([], $requests[0]['response_headers']);
        $this->assertSame([], $requests[0]['meta']);
    }

    public function test_network_requests_preserve_numeric_status_codes(): void
    {
        $normalizer = new DebuggerPayloadNormalizer();

        $requests = $normalizer->networkRequests([
            'network_requests' => [[
                'method' => 'GET',
                'url' => 'https://example.test/ping',
                'status_code' => '204',
                'duration_ms' => 18.4,
            ]],
        ]);

        $this->assertCount(1, $requests);
        $this->assertSame(204, $requests[0]['status_code']);
        $this->assertSame(18, $requests[0]['duration_ms']);
    }
}
