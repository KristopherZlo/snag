<?php

namespace App\Http\Controllers\Web;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LocalizationController
{
    public function __invoke(Request $request, string $locale): RedirectResponse
    {
        $supportedLocales = collect(config('snag.localization.supported_locales', []))
            ->pluck('code')
            ->filter(fn ($value) => is_string($value) && $value !== '')
            ->values()
            ->all();

        $resolvedLocale = in_array($locale, $supportedLocales, true)
            ? $locale
            : (string) config('app.locale', 'en');

        $redirectTo = (string) $request->query('redirect', '/');

        if ($redirectTo === '' || ! str_starts_with($redirectTo, '/')) {
            $redirectTo = '/';
        }

        $cookiePath = rtrim($request->getBaseUrl(), '/');
        $cookiePath = $cookiePath === '' ? '/' : $cookiePath;

        return redirect()->to($redirectTo)->cookie(cookie(
            name: (string) config('snag.localization.cookie_name', 'snag_locale'),
            value: $resolvedLocale,
            minutes: (int) config('snag.localization.cookie_minutes', 60 * 24 * 365),
            path: $cookiePath,
            domain: null,
            secure: $request->isSecure(),
            httpOnly: false,
            raw: false,
            sameSite: 'lax',
        ));
    }
}
