<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetApplicationLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $supportedLocales = collect(config('snag.localization.supported_locales', []))
            ->pluck('code')
            ->filter(fn ($locale) => is_string($locale) && $locale !== '')
            ->values()
            ->all();

        $fallbackLocale = (string) config('app.locale', 'en');
        $cookieName = (string) config('snag.localization.cookie_name', 'snag_locale');
        $requestedLocale = $request->cookie($cookieName, $fallbackLocale);

        if (! is_string($requestedLocale) || ! in_array($requestedLocale, $supportedLocales, true)) {
            $requestedLocale = $fallbackLocale;
        }

        App::setLocale($requestedLocale);

        return $next($request);
    }
}
