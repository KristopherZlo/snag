<?php

namespace App\Support;

final class HashedToken
{
    public static function hash(string $value): string
    {
        return hash('sha256', $value);
    }

    public static function isHash(?string $value): bool
    {
        return is_string($value) && preg_match('/\A[a-f0-9]{64}\z/', $value) === 1;
    }

    public static function needsHashing(?string $value): bool
    {
        return is_string($value) && $value !== '' && ! self::isHash($value);
    }
}
