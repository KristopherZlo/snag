<?php

namespace App\Runtime\Xampp;

use Illuminate\Contracts\Foundation\Application;
use Illuminate\Filesystem\Filesystem;

class XamppRuntimeConfigRepository
{
    private const RELATIVE_PATH = 'cache/xampp-runtime.php';

    public function __construct(
        private readonly Application $app,
        private readonly Filesystem $files,
    ) {}

    public function exists(): bool
    {
        return $this->shouldApplyRuntimeFile()
            && $this->files->exists($this->path());
    }

    public function path(): string
    {
        return $this->app->bootstrapPath(self::RELATIVE_PATH);
    }

    /**
     * @return array<string, mixed>
     */
    public function read(): array
    {
        if (! $this->exists()) {
            return [];
        }

        $overrides = $this->files->getRequire($this->path());

        return is_array($overrides) ? $overrides : [];
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    public function write(array $overrides): void
    {
        $this->files->put(
            $this->path(),
            '<?php return '.var_export($overrides, true).';'.PHP_EOL
        );
    }

    public function clear(): void
    {
        $this->files->delete($this->path());
    }

    private function shouldApplyRuntimeFile(): bool
    {
        if (! filter_var(env('XAMPP_RUNTIME_FILE_ENABLED', true), FILTER_VALIDATE_BOOL)) {
            return false;
        }

        $basePath = str_replace('\\', '/', strtolower($this->app->basePath()));

        return str_contains($basePath, '/xampp/htdocs/');
    }
}
