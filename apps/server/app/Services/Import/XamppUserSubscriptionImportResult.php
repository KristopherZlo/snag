<?php

namespace App\Services\Import;

class XamppUserSubscriptionImportResult
{
    /**
     * @param  array<string, int>  $processed
     */
    public function __construct(
        public readonly array $processed,
    ) {}

    public function totalRows(): int
    {
        return array_sum($this->processed);
    }
}
