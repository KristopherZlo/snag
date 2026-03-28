<?php

namespace App\Runtime\Xampp;

class LocalNetworkAddressDetector
{
    public function detect(): string
    {
        $addresses = $this->hostAddresses();

        foreach ($addresses as $address) {
            if ($this->isPrivateIpv4Address($address)) {
                return $address;
            }
        }

        foreach ($addresses as $address) {
            if (filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) && $address !== '127.0.0.1') {
                return $address;
            }
        }

        return 'localhost';
    }

    /**
     * @return array<int, string>
     */
    protected function hostAddresses(): array
    {
        return gethostbynamel(gethostname()) ?: [];
    }

    private function isPrivateIpv4Address(string $address): bool
    {
        if (! filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return false;
        }

        if (str_starts_with($address, '10.')) {
            return true;
        }

        if (str_starts_with($address, '192.168.')) {
            return true;
        }

        if (! preg_match('/^172\.(\d{1,2})\./', $address, $matches)) {
            return false;
        }

        $octet = (int) $matches[1];

        return $octet >= 16 && $octet <= 31;
    }
}
