<?php

namespace Tests\Unit\Reports;

use App\Services\Reports\ReportArtifactPlaceholderGenerator;
use Tests\TestCase;

class ReportArtifactPlaceholderGeneratorTest extends TestCase
{
    public function test_it_builds_placeholder_metadata_from_image_binary(): void
    {
        $generator = app(ReportArtifactPlaceholderGenerator::class);
        $binary = $this->pngBinary(320, 180, [31, 41, 55], [217, 119, 6]);

        $placeholder = $generator->placeholderForBinary($binary);

        $this->assertNotNull($placeholder);
        $this->assertStringStartsWith('#', $placeholder['average_color']);
        $this->assertStringStartsWith('data:image/', $placeholder['blur_data_url']);
        $this->assertSame(320, $placeholder['width']);
        $this->assertSame(180, $placeholder['height']);
    }

    private function pngBinary(int $width, int $height, array $backgroundRgb, array $accentRgb): string
    {
        $image = imagecreatetruecolor($width, $height);
        $background = imagecolorallocate($image, $backgroundRgb[0], $backgroundRgb[1], $backgroundRgb[2]);
        $accent = imagecolorallocate($image, $accentRgb[0], $accentRgb[1], $accentRgb[2]);

        imagefill($image, 0, 0, $background);
        imagefilledrectangle($image, 24, 24, $width - 24, 84, $accent);

        ob_start();
        imagepng($image);
        $binary = ob_get_clean();
        imagedestroy($image);

        return $binary ?: '';
    }
}
