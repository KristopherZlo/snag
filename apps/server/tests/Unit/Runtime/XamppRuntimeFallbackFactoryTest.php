<?php

namespace Tests\Unit\Runtime;

use App\Runtime\Xampp\XamppRuntimeFallbackFactory;
use Illuminate\Contracts\Foundation\Application;
use PHPUnit\Framework\TestCase;

class XamppRuntimeFallbackFactoryTest extends TestCase
{
    protected function tearDown(): void
    {
        putenv('XAMPP_WEB_FALLBACK_ENABLED');

        parent::tearDown();
    }

    public function test_factory_builds_a_runtime_profile_for_xampp_hosted_web_requests(): void
    {
        $application = $this->createMock(Application::class);
        $application->method('runningInConsole')->willReturn(false);
        $application->method('runningUnitTests')->willReturn(false);
        $application->method('basePath')->willReturn('E:\\xampp\\htdocs\\snag\\apps\\server');

        $factory = new XamppRuntimeFallbackFactory($application);
        $profile = $factory->fromServer([
            'HTTP_HOST' => '192.168.43.122',
        ]);

        $this->assertNotNull($profile);
        $this->assertSame('http://192.168.43.122/snag', $profile->appUrl);
        $this->assertSame('192.168.43.122', $profile->viteHost);
        $this->assertSame('192.168.43.122', $profile->reverbHost);
        $this->assertSame('snag_xampp', $profile->dbDatabase);
    }

    public function test_factory_returns_null_outside_xampp_web_context(): void
    {
        $application = $this->createMock(Application::class);
        $application->method('runningInConsole')->willReturn(false);
        $application->method('runningUnitTests')->willReturn(false);
        $application->method('basePath')->willReturn('C:\\projects\\snag\\apps\\server');

        $factory = new XamppRuntimeFallbackFactory($application);

        $this->assertNull($factory->fromServer([
            'HTTP_HOST' => 'localhost',
        ]));
    }

    public function test_factory_can_be_disabled_with_an_environment_flag(): void
    {
        putenv('XAMPP_WEB_FALLBACK_ENABLED=false');

        $application = $this->createMock(Application::class);
        $application->method('runningInConsole')->willReturn(false);
        $application->method('runningUnitTests')->willReturn(false);
        $application->method('basePath')->willReturn('E:\\xampp\\htdocs\\snag\\apps\\server');

        $factory = new XamppRuntimeFallbackFactory($application);

        $this->assertNull($factory->fromServer([
            'HTTP_HOST' => 'localhost',
        ]));
    }
}
