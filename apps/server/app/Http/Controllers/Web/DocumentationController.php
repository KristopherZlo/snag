<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use finfo;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DocumentationController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const EXTENSION_MIME_TYPES = [
        'css' => 'text/css; charset=UTF-8',
        'html' => 'text/html; charset=UTF-8',
        'ico' => 'image/x-icon',
        'js' => 'application/javascript; charset=UTF-8',
        'json' => 'application/json; charset=UTF-8',
        'map' => 'application/json; charset=UTF-8',
        'svg' => 'image/svg+xml',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
    ];

    public function __invoke(Request $request, ?string $path = null): BinaryFileResponse
    {
        $docsDistPath = base_path('../docs/docs/.vitepress/dist');
        $resolvedPath = $this->resolvePath($docsDistPath, $path);

        if ($resolvedPath === null) {
            $fallback404 = $this->resolvePath($docsDistPath, '404.html');

            abort_unless($fallback404 !== null, 404);

            return $this->fileResponse($fallback404, 404);
        }

        return $this->fileResponse($resolvedPath);
    }

    private function resolvePath(string $distPath, ?string $path): ?string
    {
        $root = realpath($distPath);

        if (! is_string($root) || ! is_dir($root)) {
            return null;
        }

        $relativePath = trim((string) $path, '/');
        $candidates = $relativePath === ''
            ? ['index.html']
            : $this->candidatePaths($relativePath);

        foreach ($candidates as $candidate) {
            $resolved = realpath($root.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $candidate));

            if (! is_string($resolved) || ! is_file($resolved) || ! $this->isWithinRoot($root, $resolved)) {
                continue;
            }

            return $resolved;
        }

        return null;
    }

    /**
     * @return list<string>
     */
    private function candidatePaths(string $path): array
    {
        if (pathinfo($path, PATHINFO_EXTENSION) !== '') {
            return [$path];
        }

        return [
            $path.'.html',
            $path.'/index.html',
        ];
    }

    private function isWithinRoot(string $root, string $candidate): bool
    {
        $normalizedRoot = $this->normalizePath($root);
        $normalizedCandidate = $this->normalizePath($candidate);

        return $normalizedCandidate === $normalizedRoot
            || str_starts_with($normalizedCandidate, $normalizedRoot.'/');
    }

    private function normalizePath(string $path): string
    {
        return rtrim(str_replace('\\', '/', $path), '/');
    }

    private function fileResponse(string $path, int $status = 200): BinaryFileResponse
    {
        $relativePath = ltrim(str_replace($this->normalizePath(base_path('../docs/docs/.vitepress/dist')), '', $this->normalizePath($path)), '/');
        $cacheLifetime = str_starts_with($relativePath, 'assets/') ? 31536000 : 3600;

        return new BinaryFileResponse($path, $status, [
            'Cache-Control' => 'public, max-age='.$cacheLifetime.($cacheLifetime >= 31536000 ? ', immutable' : ''),
            'Content-Type' => $this->detectMimeType($path),
        ], true, 'inline');
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
}
