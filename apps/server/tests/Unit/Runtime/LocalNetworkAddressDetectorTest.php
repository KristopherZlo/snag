<?php

namespace Tests\Unit\Runtime;

use App\Runtime\Xampp\LocalNetworkAddressDetector;
use PHPUnit\Framework\TestCase;

class LocalNetworkAddressDetectorTest extends TestCase
{
    public function test_detector_prefers_private_ipv4_addresses(): void
    {
        $detector = new class extends LocalNetworkAddressDetector
        {
            protected function hostAddresses(): array
            {
                return ['127.0.0.1', '10.0.0.4', '203.0.113.10'];
            }
        };

        $this->assertSame('10.0.0.4', $detector->detect());
    }

    public function test_detector_falls_back_to_non_loopback_or_localhost(): void
    {
        $publicDetector = new class extends LocalNetworkAddressDetector
        {
            protected function hostAddresses(): array
            {
                return ['127.0.0.1', '203.0.113.10'];
            }
        };
        $localhostDetector = new class extends LocalNetworkAddressDetector
        {
            protected function hostAddresses(): array
            {
                return ['127.0.0.1'];
            }
        };

        $this->assertSame('203.0.113.10', $publicDetector->detect());
        $this->assertSame('localhost', $localhostDetector->detect());
    }
}
