<?php

namespace Tests\Unit\Runtime;

use App\Runtime\Xampp\XamppRuntimeProfile;
use PHPUnit\Framework\TestCase;

class XamppRuntimeProfileTest extends TestCase
{
    public function test_profile_builds_expected_runtime_overrides(): void
    {
        $profile = new XamppRuntimeProfile(
            appUrl: 'http://localhost/snag',
            dbHost: '127.0.0.1',
            dbPort: 3306,
            dbDatabase: 'snag_xampp',
            dbUsername: 'root',
            dbPassword: '',
            viteHost: '127.0.0.1',
            vitePort: 5173,
            reverbHost: '127.0.0.1',
            reverbPort: 8080,
        );

        $overrides = $profile->configOverrides();

        $this->assertSame('http://localhost/snag', $overrides['app.url']);
        $this->assertArrayNotHasKey('app.asset_url', $overrides);
        $this->assertSame('/snag', $overrides['session.path']);
        $this->assertSame('mysql', $overrides['database.default']);
        $this->assertSame('local', $overrides['filesystems.default']);
        $this->assertSame('reverb', $overrides['broadcasting.default']);
        $this->assertSame('snag-xampp-key', $overrides['reverb.apps.apps.0.key']);
        $this->assertSame('snag-xampp-secret', $overrides['reverb.apps.apps.0.secret']);
        $this->assertSame('snag-xampp', $overrides['reverb.apps.apps.0.app_id']);
        $this->assertSame('snag-xampp-key', $overrides['broadcasting.connections.reverb.key']);
        $this->assertSame('snag-xampp-secret', $overrides['broadcasting.connections.reverb.secret']);
        $this->assertSame('snag-xampp', $overrides['broadcasting.connections.reverb.app_id']);
        $this->assertSame('http://127.0.0.1:5173', $profile->viteUrl());
        $this->assertSame('http://127.0.0.1:8080', $profile->reverbUrl());
        $this->assertSame('http://localhost/snag/up', $profile->healthUrl());
    }

    public function test_profile_uses_https_for_vite_when_the_app_url_is_https(): void
    {
        $profile = new XamppRuntimeProfile(
            appUrl: 'https://192.168.43.122/snag',
            dbHost: '127.0.0.1',
            dbPort: 3306,
            dbDatabase: 'snag_xampp',
            dbUsername: 'root',
            dbPassword: '',
            viteHost: '192.168.43.122',
            vitePort: 5173,
            reverbHost: '192.168.43.122',
            reverbPort: 8080,
        );

        $this->assertTrue($profile->usesHttps());
        $this->assertSame('https://192.168.43.122:5173', $profile->viteUrl());
        $this->assertSame('https://192.168.43.122/snag/up', $profile->healthUrl());
    }
}
