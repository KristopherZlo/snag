<?php

namespace Tests\Unit\Runtime;

use PHPUnit\Framework\TestCase;

class XamppRootHtaccessTest extends TestCase
{
    public function test_root_htaccess_forwards_authorization_and_xsrf_headers(): void
    {
        $contents = file_get_contents(dirname(__DIR__, 5).'/.htaccess');

        $this->assertIsString($contents);
        $this->assertStringContainsString('HTTP_AUTHORIZATION', $contents);
        $this->assertStringContainsString('HTTP_X_XSRF_TOKEN', $contents);
    }
}
