<?php

declare(strict_types=1);

require __DIR__.'/apps/server/vendor/autoload.php';

$requestHeaderBridge = new \App\Runtime\Xampp\RequestHeaderBridge();

$_SERVER = $requestHeaderBridge->bridge(
    $_SERVER,
    function_exists('getallheaders') ? (array) getallheaders() : [],
);

$assetBridge = new \App\Runtime\Xampp\PublicAssetBridge(__DIR__.'/apps/server/public');
$resolvedAsset = $assetBridge->resolve(
    $_SERVER['REQUEST_URI'] ?? '/',
    $_SERVER['SCRIPT_NAME'] ?? '/index.php'
);

if ($resolvedAsset !== null) {
    $assetBridge->send($resolvedAsset);
}

$entrypoint = __DIR__.'/apps/server/public/index.php';

if (! is_file($entrypoint)) {
    http_response_code(500);
    echo 'Laravel entrypoint not found.';

    exit(1);
}

require $entrypoint;
