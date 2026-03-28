<?php

namespace Tests\Unit\Runtime;

use App\Runtime\Xampp\RequestHeaderBridge;
use PHPUnit\Framework\TestCase;

class RequestHeaderBridgeTest extends TestCase
{
    public function test_bridge_promotes_redirected_authorization_and_xsrf_headers(): void
    {
        $bridge = new RequestHeaderBridge;

        $server = $bridge->bridge([
            'REDIRECT_HTTP_AUTHORIZATION' => 'Bearer token-1',
            'REDIRECT_HTTP_X_XSRF_TOKEN' => 'token-2',
        ]);

        $this->assertSame('Bearer token-1', $server['HTTP_AUTHORIZATION']);
        $this->assertSame('token-2', $server['HTTP_X_XSRF_TOKEN']);
    }

    public function test_bridge_uses_raw_request_headers_when_server_values_are_missing(): void
    {
        $bridge = new RequestHeaderBridge;

        $server = $bridge->bridge([], [
            'Authorization' => 'Bearer token-3',
            'X-XSRF-Token' => 'token-4',
        ]);

        $this->assertSame('Bearer token-3', $server['HTTP_AUTHORIZATION']);
        $this->assertSame('token-4', $server['HTTP_X_XSRF_TOKEN']);
    }

    public function test_bridge_handles_lowercase_and_multi_redirect_header_keys(): void
    {
        $bridge = new RequestHeaderBridge;

        $server = $bridge->bridge([
            'REDIRECT_REDIRECT_HTTP_AUTHORIZATION' => 'Bearer token-5',
        ], [
            'x-xsrf-token' => 'token-6',
        ]);

        $this->assertSame('Bearer token-5', $server['HTTP_AUTHORIZATION']);
        $this->assertSame('token-6', $server['HTTP_X_XSRF_TOKEN']);
    }

    public function test_bridge_extracts_bearer_token_from_promoted_authorization_header(): void
    {
        $bridge = new RequestHeaderBridge;

        $token = $bridge->bearerToken([
            'REDIRECT_HTTP_AUTHORIZATION' => 'Bearer token-7',
        ]);

        $this->assertSame('token-7', $token);
    }
}
