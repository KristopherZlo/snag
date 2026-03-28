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
        return $this->files->exists($this->path());
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

        $overrides = require $this->path();

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
}
