<?php

namespace Tests\Unit\Runtime;

use App\Runtime\Xampp\PublicAssetBridge;
use PHPUnit\Framework\TestCase;

class PublicAssetBridgeTest extends TestCase
{
    private string $publicPath;

    private string $tempDirectory;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tempDirectory = sys_get_temp_dir().DIRECTORY_SEPARATOR.'snag-asset-bridge-'.bin2hex(random_bytes(6));
        $this->publicPath = $this->tempDirectory.DIRECTORY_SEPARATOR.'public';

        mkdir($this->publicPath.DIRECTORY_SEPARATOR.'build'.DIRECTORY_SEPARATOR.'assets', 0777, true);
        file_put_contents($this->publicPath.DIRECTORY_SEPARATOR.'build'.DIRECTORY_SEPARATOR.'assets'.DIRECTORY_SEPARATOR.'app.js', 'console.log("asset");');
        file_put_contents($this->publicPath.DIRECTORY_SEPARATOR.'build'.DIRECTORY_SEPARATOR.'assets'.DIRECTORY_SEPARATOR.'app.css', 'body { color: #000; }');
    }

    protected function tearDown(): void
    {
        $this->deleteDirectory($this->tempDirectory);

        parent::tearDown();
    }

    public function test_it_resolves_hashed_build_assets_beneath_the_xampp_base_path(): void
    {
        $bridge = new PublicAssetBridge($this->publicPath);
        $asset = $bridge->resolve('/snag/build/assets/app.js', '/snag/index.php');

        $this->assertNotNull($asset);
        $this->assertSame(
            realpath($this->publicPath.DIRECTORY_SEPARATOR.'build'.DIRECTORY_SEPARATOR.'assets'.DIRECTORY_SEPARATOR.'app.js'),
            $asset->path
        );
        $this->assertGreaterThan(0, $asset->size);
        $this->assertStringContainsString('javascript', $asset->mimeType);
        $this->assertSame(31536000, $asset->cacheLifetimeSeconds);
    }

    public function test_it_rejects_path_traversal_outside_of_the_public_directory(): void
    {
        $bridge = new PublicAssetBridge($this->publicPath);

        $asset = $bridge->resolve('/snag/build/assets/../../../../.env', '/snag/index.php');

        $this->assertNull($asset);
    }

    public function test_it_resolves_stylesheets_with_query_strings_using_a_web_safe_mime_type(): void
    {
        $bridge = new PublicAssetBridge($this->publicPath);
        $asset = $bridge->resolve('/snag/build/assets/app.css?v=060e8654', '/snag/index.php');

        $this->assertNotNull($asset);
        $this->assertSame('text/css', $asset->mimeType);
        $this->assertSame(31536000, $asset->cacheLifetimeSeconds);
    }

    public function test_it_does_not_attempt_to_serve_php_files(): void
    {
        file_put_contents($this->publicPath.DIRECTORY_SEPARATOR.'index.php', '<?php echo "nope";');

        $bridge = new PublicAssetBridge($this->publicPath);

        $this->assertNull($bridge->resolve('/snag/index.php', '/snag/index.php'));
    }

    private function deleteDirectory(string $directory): void
    {
        if (! is_dir($directory)) {
            return;
        }

        $items = array_diff(scandir($directory) ?: [], ['.', '..']);

        foreach ($items as $item) {
            $path = $directory.DIRECTORY_SEPARATOR.$item;

            if (is_dir($path)) {
                $this->deleteDirectory($path);

                continue;
            }

            unlink($path);
        }

        rmdir($directory);
    }
}
