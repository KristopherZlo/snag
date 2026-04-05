<?php

namespace App\Runtime\Xampp;

use Closure;
use RuntimeException;
use Symfony\Component\Process\Process;

class ManagedService
{
    private const OUTPUT_TAIL_LIMIT = 8000;

    private ?Process $process = null;

    private string $outputTail = '';

    private bool $stopping = false;

    /**
     * @param  list<string>  $command
     * @param  Closure(self): bool  $readinessProbe
     */
    public function __construct(
        private readonly string $name,
        private readonly array $command,
        private readonly string $workingDirectory,
        private readonly Closure $readinessProbe,
        private readonly ?string $endpoint = null,
        private readonly array $environment = [],
    ) {}

    public function endpoint(): ?string
    {
        return $this->endpoint;
    }

    public function exitCode(): ?int
    {
        return $this->process?->getExitCode();
    }

    public function hasExitedUnexpectedly(): bool
    {
        return $this->process !== null
            && ! $this->process->isRunning()
            && ! $this->stopping;
    }

    public function isReady(): bool
    {
        if (! $this->isRunning()) {
            return false;
        }

        return (bool) ($this->readinessProbe)($this);
    }

    public function isRunning(): bool
    {
        return $this->process?->isRunning() ?? false;
    }

    public function name(): string
    {
        return $this->name;
    }

    public function outputTail(): string
    {
        return trim($this->outputTail);
    }

    public function start(): void
    {
        if ($this->process !== null) {
            throw new RuntimeException("Service [{$this->name}] has already been started.");
        }

        $this->process = new Process(
            $this->command,
            $this->workingDirectory,
            $this->environment !== [] ? $this->environment : null,
        );
        $this->process->setTimeout(null);
        $this->process->setIdleTimeout(null);
        $this->process->start(function (string $type, string $output): void {
            $this->appendOutput($output);
        });
    }

    public function stop(int $timeoutSeconds = 5): void
    {
        $this->stopping = true;

        if ($this->process?->isRunning()) {
            $this->process->stop($timeoutSeconds);
        }
    }

    private function appendOutput(string $output): void
    {
        $this->outputTail .= $output;

        if (strlen($this->outputTail) > self::OUTPUT_TAIL_LIMIT) {
            $this->outputTail = substr($this->outputTail, -self::OUTPUT_TAIL_LIMIT);
        }
    }
}
