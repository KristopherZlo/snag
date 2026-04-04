<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Vite;

class WebsiteWidgetScriptController extends Controller
{
    public function __invoke(): Response
    {
        $assetUrl = Vite::asset('resources/js/embed/widget.js');
        $script = <<<JS
(function () {
    var current = document.currentScript;
    var loader = document.createElement('script');
    loader.type = 'module';
    loader.async = true;
    loader.src = %s;

    if (current) {
        Array.prototype.forEach.call(current.attributes || [], function (attribute) {
            if (attribute && typeof attribute.name === 'string' && attribute.name.indexOf('data-snag-') === 0) {
                loader.setAttribute(attribute.name, attribute.value);
            }
        });

        current.removeAttribute('data-snag-widget');
        current.removeAttribute('data-snag-base-url');
        current.removeAttribute('data-snag-debug');
        current.setAttribute('data-snag-widget-loader', 'resolved');

        var parent = current.parentNode || document.head || document.documentElement;
        parent.insertBefore(loader, current.nextSibling);
        return;
    }

    (document.head || document.documentElement).appendChild(loader);
})();
JS;

        return response(
            sprintf($script, json_encode($assetUrl, JSON_THROW_ON_ERROR)),
            200,
            [
                'Content-Type' => 'application/javascript; charset=UTF-8',
                'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma' => 'no-cache',
                'Expires' => '0',
            ],
        );
    }
}
