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
        $this->assertSame('/snag', $overrides['session.path']);
        $this->assertSame('mysql', $overrides['database.default']);
        $this->assertSame('local', $overrides['filesystems.default']);
        $this->assertSame('reverb', $overrides['broadcasting.default']);
        $this->assertSame('http://127.0.0.1:5173', $profile->viteUrl());
        $this->assertSame('http://127.0.0.1:8080', $profile->reverbUrl());
        $this->assertSame('http://localhost/snag/up', $profile->healthUrl());
    }
}
