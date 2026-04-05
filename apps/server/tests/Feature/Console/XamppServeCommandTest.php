<?php

namespace Tests\Feature\Console;

use App\Runtime\Xampp\LocalNetworkAddressDetector;
use App\Runtime\Xampp\XamppRuntimeManager;
use App\Runtime\Xampp\XamppRuntimeProfile;
use Mockery;
use Mockery\Adapter\Phpunit\MockeryPHPUnitIntegration;
use Tests\TestCase;

class XamppServeCommandTest extends TestCase
{
    use MockeryPHPUnitIntegration;

    public function test_command_orchestrates_runtime_manager_and_exits_cleanly(): void
    {
        $manager = Mockery::mock(XamppRuntimeManager::class);
        $manager->shouldReceive('activate')->once()->with(Mockery::on(
            fn (XamppRuntimeProfile $profile): bool => $profile->appUrl === 'http://192.168.43.122/snag'
                && $profile->viteHost === '192.168.43.122'
                && $profile->reverbHost === '192.168.43.122'
        ));
        $manager->shouldReceive('ensureDatabase')->once();
        $manager->shouldReceive('ensureMigrationsApplied')->once();
        $manager->shouldReceive('ensureManagedPortsAreAvailable')->once();
        $manager->shouldReceive('makeManagedServices')->once()->andReturn([]);
        $manager->shouldReceive('startServices')->once()->with([]);
        $manager->shouldReceive('waitUntilReady')->once()->with([], 1);
        $manager->shouldReceive('captureStatusSnapshot')->atLeast()->once()->andReturn([
            [
                'name' => 'apache',
                'managed' => false,
                'status' => 'ready',
                'detail' => 'http://localhost/snag/up',
            ],
            [
                'name' => 'mysql',
                'managed' => false,
                'status' => 'ready',
                'detail' => '127.0.0.1:3306/snag_xampp',
            ],
        ]);
        $manager->shouldReceive('stopServices')->once()->with([]);
        $manager->shouldReceive('deactivate')->once();

        $this->app->instance(XamppRuntimeManager::class, $manager);
        $this->app->instance(LocalNetworkAddressDetector::class, new class extends LocalNetworkAddressDetector
        {
            public function detect(): string
            {
                return '192.168.43.122';
            }
        });

        $this->artisan('snag:xampp', [
            '--app-url' => 'http://192.168.43.122/snag',
            '--boot-timeout' => 1,
            '--status-interval' => 1,
            '--stop-after' => 1,
        ])->assertSuccessful();
    }

    public function test_command_fails_fast_when_a_managed_port_is_already_in_use(): void
    {
        $manager = Mockery::mock(XamppRuntimeManager::class);
        $manager->shouldReceive('activate')->once();
        $manager->shouldReceive('ensureDatabase')->once();
        $manager->shouldReceive('ensureMigrationsApplied')->once();
        $manager->shouldReceive('ensureManagedPortsAreAvailable')
            ->once()
            ->andThrow(new \RuntimeException(
                'Vite port 5173 on 192.168.43.122 is already in use. An existing Vite dev server is already responding on that port. Stop the existing process or choose a different port.',
            ));
        $manager->shouldReceive('stopServices')->once()->with([]);
        $manager->shouldReceive('deactivate')->once();

        $this->app->instance(XamppRuntimeManager::class, $manager);
        $this->app->instance(LocalNetworkAddressDetector::class, new class extends LocalNetworkAddressDetector
        {
            public function detect(): string
            {
                return '192.168.43.122';
            }
        });

        $this->artisan('snag:xampp', [
            '--app-url' => 'http://192.168.43.122/snag',
        ])->assertFailed();
    }
}
