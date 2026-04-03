<?php

namespace Tests\Unit\Runtime;

use App\Runtime\Xampp\XamppRuntimeConfigRepository;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Filesystem\Filesystem;
use PHPUnit\Framework\TestCase;

class XamppRuntimeConfigRepositoryTest extends TestCase
{
    protected function tearDown(): void
    {
        putenv('XAMPP_RUNTIME_FILE_ENABLED');

        parent::tearDown();
    }

    public function test_it_reads_runtime_overrides_inside_an_xampp_installation(): void
    {
        $application = $this->createMock(Application::class);
        $application->method('basePath')->willReturn('E:\\xampp\\htdocs\\snag\\apps\\server');
        $application->method('bootstrapPath')->with('cache/xampp-runtime.php')->willReturn('C:\\temp\\xampp-runtime.php');

        $filesystem = $this->createMock(Filesystem::class);
        $filesystem->method('exists')->with('C:\\temp\\xampp-runtime.php')->willReturn(true);
        $filesystem->method('getRequire')->with('C:\\temp\\xampp-runtime.php')->willReturn([
            'database.default' => 'mysql',
        ]);

        $repository = new XamppRuntimeConfigRepository($application, $filesystem);

        $this->assertSame([
            'database.default' => 'mysql',
        ], $repository->read());
    }

    public function test_it_ignores_runtime_overrides_outside_xampp_even_when_the_file_exists(): void
    {
        $application = $this->createMock(Application::class);
        $application->method('basePath')->willReturn('/var/www/html');

        $filesystem = $this->createMock(Filesystem::class);
        $filesystem->expects($this->never())->method('exists');

        $repository = new XamppRuntimeConfigRepository($application, $filesystem);

        $this->assertFalse($repository->exists());
        $this->assertSame([], $repository->read());
    }

    public function test_it_can_disable_the_runtime_file_with_an_environment_flag(): void
    {
        putenv('XAMPP_RUNTIME_FILE_ENABLED=false');

        $application = $this->createMock(Application::class);
        $application->method('basePath')->willReturn('E:\\xampp\\htdocs\\snag\\apps\\server');

        $filesystem = $this->createMock(Filesystem::class);
        $filesystem->expects($this->never())->method('exists');

        $repository = new XamppRuntimeConfigRepository($application, $filesystem);

        $this->assertFalse($repository->exists());
    }
}
