<?php

namespace App\Runtime\Xampp;

final readonly class ResolvedPublicAsset
{
    public function __construct(
        public string $path,
        public string $mimeType,
        public int $size,
        public int $cacheLifetimeSeconds,
    ) {}
}
