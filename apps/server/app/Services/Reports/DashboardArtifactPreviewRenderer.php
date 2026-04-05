<?php

namespace App\Services\Reports;

use App\Models\ReportArtifact;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DashboardArtifactPreviewRenderer
{
    private const DEFAULT_WIDTH = 640;

    /**
     * @var array<int, int>
     */
    private const WIDTH_STEPS = [256, 384, 512, 640, 768, 960, 1280, 1600];

    public function render(ReportArtifact $artifact, ?int $requestedWidth = null): BinaryFileResponse
    {
        return $this->renderScreenshot($artifact, $requestedWidth);
    }

    public function normalizeWidth(?int $requestedWidth = null): int
    {
        $width = max(1, (int) ($requestedWidth ?? self::DEFAULT_WIDTH));

        foreach (self::WIDTH_STEPS as $step) {
            if ($width <= $step) {
                return $step;
            }
        }

        return self::WIDTH_STEPS[array_key_last(self::WIDTH_STEPS)];
    }

    private function renderScreenshot(ReportArtifact $artifact, ?int $requestedWidth = null): BinaryFileResponse
    {
        $disk = Storage::disk($artifact->disk);

        abort_unless($disk->exists($artifact->path), 404);

        $targetWidth = $this->normalizeWidth($requestedWidth);
        $cacheFile = $this->cacheFileFor($artifact, $targetWidth);

        if (is_file($cacheFile['path'])) {
            return $this->cachedFileResponse($cacheFile['path'], $cacheFile['content_type']);
        }

        $binary = $disk->get($artifact->path);
        $source = @imagecreatefromstring($binary);

        if (! $source) {
            abort(404);
        }

        $sourceWidth = imagesx($source);
        $sourceHeight = imagesy($source);

        if ($sourceWidth <= 0 || $sourceHeight <= 0) {
            imagedestroy($source);
            abort(404);
        }

        if ($sourceWidth <= $targetWidth) {
            imagedestroy($source);

            $cacheFile = $this->cacheFileFor($artifact, $sourceWidth, forcePng: true);
            File::ensureDirectoryExists(dirname($cacheFile['path']));

            if (! is_file($cacheFile['path'])) {
                File::put($cacheFile['path'], $binary);
            }

            return $this->cachedFileResponse($cacheFile['path'], $artifact->content_type ?: 'image/png');
        }

        $targetHeight = max(1, (int) round($sourceHeight * ($targetWidth / $sourceWidth)));
        $canvas = imagecreatetruecolor($targetWidth, $targetHeight);

        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);

        $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
        imagefill($canvas, 0, 0, $transparent);
        imagecopyresampled($canvas, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $sourceWidth, $sourceHeight);

        File::ensureDirectoryExists(dirname($cacheFile['path']));

        $writeSucceeded = false;

        if ($cacheFile['extension'] === 'webp') {
            $writeSucceeded = imagewebp($canvas, $cacheFile['path'], 82);
        }

        if (! $writeSucceeded) {
            $cacheFile = $this->cacheFileFor($artifact, $targetWidth, forcePng: true);
            File::ensureDirectoryExists(dirname($cacheFile['path']));
            imagepng($canvas, $cacheFile['path'], 6);
        }

        imagedestroy($canvas);
        imagedestroy($source);

        return $this->cachedFileResponse($cacheFile['path'], $cacheFile['content_type']);
    }

    /**
     * @return array{path:string, extension:string, content_type:string}
     */
    private function cacheFileFor(ReportArtifact $artifact, int $targetWidth, bool $forcePng = false): array
    {
        $supportsWebp = function_exists('imagewebp') && ! $forcePng;
        $extension = $supportsWebp ? 'webp' : 'png';
        $contentType = $supportsWebp ? 'image/webp' : 'image/png';
        $version = sha1(implode('|', [
            $artifact->id,
            $artifact->path,
            $artifact->checksum ?? '',
            $artifact->updated_at?->timestamp ?? '',
            $artifact->byte_size ?? '',
        ]));
        $path = storage_path('app/dashboard-previews/'.$artifact->organization_id.'/'.$artifact->id.'/'.$version.'-'.$targetWidth.'.'.$extension);

        return [
            'path' => $path,
            'extension' => $extension,
            'content_type' => $contentType,
        ];
    }

    private function cachedFileResponse(string $path, string $contentType): BinaryFileResponse
    {
        return response()->file($path, [
            'Content-Type' => $contentType,
            'Cache-Control' => 'private, max-age=300',
        ]);
    }

}
