<?php

namespace App\Services\Reports;

use App\Models\ReportArtifact;
use Illuminate\Support\Facades\Storage;

class ReportArtifactPlaceholderGenerator
{
    private const TINY_PREVIEW_WIDTH = 24;

    /**
     * @return array{average_color:string, blur_data_url:string, width:int|null, height:int|null}|null
     */
    public function ensureForArtifact(ReportArtifact $artifact): ?array
    {
        $existing = $this->placeholderFromMeta($artifact->meta);

        if ($existing) {
            return $existing;
        }

        if (! $this->supports($artifact)) {
            return null;
        }

        $placeholder = $this->placeholderForStoredFile($artifact->disk, $artifact->path);

        if (! $placeholder) {
            return null;
        }

        $meta = is_array($artifact->meta) ? $artifact->meta : [];
        $meta['placeholder'] = $placeholder;

        $artifact->forceFill([
            'meta' => $meta,
        ])->save();

        return $placeholder;
    }

    /**
     * @return array{average_color:string, blur_data_url:string, width:int|null, height:int|null}|null
     */
    public function placeholderForStoredFile(string $diskName, string $path): ?array
    {
        $disk = Storage::disk($diskName);

        if (! $disk->exists($path)) {
            return null;
        }

        $binary = $disk->get($path);

        if (! is_string($binary) || $binary === '') {
            return null;
        }

        return $this->placeholderForBinary($binary);
    }

    /**
     * @return array{average_color:string, blur_data_url:string, width:int|null, height:int|null}|null
     */
    public function placeholderForBinary(string $binary): ?array
    {
        $source = @imagecreatefromstring($binary);

        if (! $source) {
            return null;
        }

        try {
            $width = imagesx($source);
            $height = imagesy($source);

            if ($width <= 0 || $height <= 0) {
                return null;
            }

            $averageColor = $this->averageColorHex($source);
            $blurDataUrl = $this->tinyPreviewDataUrl($source, $width, $height);

            if (! $averageColor || ! $blurDataUrl) {
                return null;
            }

            return [
                'average_color' => $averageColor,
                'blur_data_url' => $blurDataUrl,
                'width' => $width,
                'height' => $height,
            ];
        } finally {
            imagedestroy($source);
        }
    }

    /**
     * @return array{average_color:string, blur_data_url:string, width:int|null, height:int|null}|null
     */
    public function placeholderFromMeta(mixed $meta): ?array
    {
        if (! is_array($meta)) {
            return null;
        }

        $placeholder = $meta['placeholder'] ?? null;

        if (! is_array($placeholder)) {
            return null;
        }

        $averageColor = $placeholder['average_color'] ?? null;
        $blurDataUrl = $placeholder['blur_data_url'] ?? null;

        if (! is_string($averageColor) || trim($averageColor) === '' || ! is_string($blurDataUrl) || trim($blurDataUrl) === '') {
            return null;
        }

        return [
            'average_color' => $averageColor,
            'blur_data_url' => $blurDataUrl,
            'width' => isset($placeholder['width']) ? (int) $placeholder['width'] : null,
            'height' => isset($placeholder['height']) ? (int) $placeholder['height'] : null,
        ];
    }

    private function supports(ReportArtifact $artifact): bool
    {
        return str_starts_with(strtolower((string) $artifact->content_type), 'image/');
    }

    private function averageColorHex(\GdImage $source): ?string
    {
        $sample = imagescale($source, 1, 1, IMG_BILINEAR_FIXED);

        if (! $sample) {
            return null;
        }

        try {
            $colorIndex = imagecolorat($sample, 0, 0);
            $channels = imagecolorsforindex($sample, $colorIndex);

            return sprintf('#%02x%02x%02x', $channels['red'], $channels['green'], $channels['blue']);
        } finally {
            imagedestroy($sample);
        }
    }

    private function tinyPreviewDataUrl(\GdImage $source, int $width, int $height): ?string
    {
        $targetWidth = max(1, min(self::TINY_PREVIEW_WIDTH, $width));
        $targetHeight = max(1, (int) round($height * ($targetWidth / $width)));
        $canvas = imagecreatetruecolor($targetWidth, $targetHeight);

        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);

        $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
        imagefill($canvas, 0, 0, $transparent);
        imagecopyresampled($canvas, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

        try {
            $bufferLevel = ob_get_level();
            ob_start();

            $contentType = 'image/webp';
            $written = false;

            if (function_exists('imagewebp')) {
                $written = imagewebp($canvas, null, 55);
            }

            if (! $written) {
                $contentType = 'image/png';
                imagepng($canvas, null, 9);
            }

            $binary = ob_get_clean();

            if (! is_string($binary) || $binary === '') {
                return null;
            }

            return 'data:'.$contentType.';base64,'.base64_encode($binary);
        } finally {
            while (ob_get_level() > $bufferLevel) {
                ob_end_clean();
            }

            imagedestroy($canvas);
        }
    }
}
