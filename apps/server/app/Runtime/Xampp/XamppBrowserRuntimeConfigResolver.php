<?php

namespace App\Runtime\Xampp;

use Illuminate\Http\Request;

class XamppBrowserRuntimeConfigResolver
{
    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    public function normalize(array $overrides, ?Request $request, bool $runningInConsole = false): array
    {
        unset($overrides['app.asset_url']);

        $configuredRootUrl = $overrides['app.url'] ?? null;

        if (
            $runningInConsole
            || ! is_string($configuredRootUrl)
            || $configuredRootUrl === ''
            || ! $request instanceof Request
        ) {
            return $overrides;
        }

        $host = $request->getHttpHost();

        if ($host === '') {
            return $overrides;
        }

        $path = trim((string) parse_url($configuredRootUrl, PHP_URL_PATH), '/');
        $overrides['app.url'] = rtrim(sprintf(
            '%s://%s%s',
            $request->getScheme(),
            $host,
            $path !== '' ? '/'.$path : '',
        ), '/');

        return $overrides;
    }
}
