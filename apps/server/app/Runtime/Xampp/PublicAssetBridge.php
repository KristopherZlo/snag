<?php

namespace App\Runtime\Xampp;

use finfo;

class PublicAssetBridge
{
    /**
     * @var array<string, string>
     */
    private const EXTENSION_MIME_TYPES = [
        'css' => 'text/css',
        'gif' => 'image/gif',
        'ico' => 'image/x-icon',
        'jpeg' => 'image/jpeg',
        'jpg' => 'image/jpeg',
        'js' => 'application/javascript',
        'json' => 'application/json',
        'map' => 'application/json',
        'mjs' => 'application/javascript',
        'png' => 'image/png',
        'svg' => 'image/svg+xml',
        'txt' => 'text/plain',
        'webmanifest' => 'application/manifest+json',
        'webp' => 'image/webp',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
    ];

    private string $normalizedPublicPath;

    public function __construct(private readonly string $publicPath)
    {
        $this->normalizedPublicPath = $this->normalizePath(realpath($publicPath) ?: $publicPath);
    }

    public function resolve(string $requestUri, string $scriptName): ?ResolvedPublicAsset
    {
        $relativePath = $this->relativePath($requestUri, $scriptName);

        if ($relativePath === '' || str_ends_with($relativePath, '/') || str_ends_with(strtolower($relativePath), '.php')) {
            return null;
        }

        $candidate = realpath($this->publicPath.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relativePath));

        if (! is_string($candidate) || ! is_file($candidate) || ! $this->isWithinPublicPath($candidate)) {
            return null;
        }

        return new ResolvedPublicAsset(
            path: $candidate,
            mimeType: $this->detectMimeType($candidate),
            size: filesize($candidate) ?: 0,
            cacheLifetimeSeconds: str_starts_with($relativePath, 'build/') ? 31536000 : 3600,
        );
    }

    public function send(ResolvedPublicAsset $asset): never
    {
        header('Content-Type: '.$asset->mimeType);
        header('Content-Length: '.$asset->size);
        header('Cache-Control: public, max-age='.$asset->cacheLifetimeSeconds.($asset->cacheLifetimeSeconds >= 31536000 ? ', immutable' : ''));

        readfile($asset->path);

        exit;
    }

    private function detectMimeType(string $path): string
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        if (isset(self::EXTENSION_MIME_TYPES[$extension])) {
            return self::EXTENSION_MIME_TYPES[$extension];
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($path);

        return is_string($mimeType) && $mimeType !== ''
            ? $mimeType
            : 'application/octet-stream';
    }

    private function isWithinPublicPath(string $path): bool
    {
        $normalizedCandidate = $this->normalizePath($path);

        return $normalizedCandidate === $this->normalizedPublicPath
            || str_starts_with($normalizedCandidate, $this->normalizedPublicPath.'/');
    }

    private function normalizePath(string $path): string
    {
        return rtrim(str_replace('\\', '/', $path), '/');
    }

    private function relativePath(string $requestUri, string $scriptName): string
    {
        $requestPath = rawurldecode((string) parse_url($requestUri, PHP_URL_PATH));
        $scriptDirectory = dirname(str_replace('\\', '/', $scriptName));
        $basePath = $scriptDirectory === '.' ? '' : rtrim($scriptDirectory, '/');

        if ($requestPath === $basePath) {
            return '';
        }

        if ($basePath !== '' && str_starts_with($requestPath, $basePath.'/')) {
            $requestPath = substr($requestPath, strlen($basePath) + 1);
        }

        return ltrim($requestPath, '/');
    }
}
