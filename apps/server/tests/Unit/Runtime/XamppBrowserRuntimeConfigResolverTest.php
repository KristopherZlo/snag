<?php

namespace Tests\Unit\Runtime;

use App\Runtime\Xampp\XamppBrowserRuntimeConfigResolver;
use Illuminate\Http\Request;
use PHPUnit\Framework\TestCase;

class XamppBrowserRuntimeConfigResolverTest extends TestCase
{
    public function test_it_uses_the_current_request_host_and_removes_asset_url(): void
    {
        $resolver = new XamppBrowserRuntimeConfigResolver;

        $normalized = $resolver->normalize(
            [
                'app.url' => 'http://192.168.224.1/snag',
                'app.asset_url' => 'http://192.168.224.1/snag',
            ],
            Request::create('http://192.168.43.122/snag/dashboard'),
        );

        $this->assertSame('http://192.168.43.122/snag', $normalized['app.url']);
        $this->assertArrayNotHasKey('app.asset_url', $normalized);
    }

    public function test_it_keeps_the_configured_root_url_in_console_mode(): void
    {
        $resolver = new XamppBrowserRuntimeConfigResolver;

        $normalized = $resolver->normalize(
            [
                'app.url' => 'http://192.168.224.1/snag',
                'app.asset_url' => 'http://192.168.224.1/snag',
            ],
            Request::create('http://192.168.43.122/snag/dashboard'),
            true,
        );

        $this->assertSame('http://192.168.224.1/snag', $normalized['app.url']);
        $this->assertArrayNotHasKey('app.asset_url', $normalized);
    }
}
