<?php

namespace Tests\Feature\Localization;

use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LocalizationPreferenceTest extends TestCase
{
    public function test_login_page_uses_the_locale_from_cookie(): void
    {
        $this->withCookie('snag_locale', 'fi')
            ->get(route('login'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/Login')
                ->where('localization.locale', 'fi')
                ->where('localization.available_locales.0.code', 'en')
                ->where('localization.available_locales.1.code', 'fi'));
    }

    public function test_invalid_locale_cookie_falls_back_to_default_locale(): void
    {
        $this->withCookie('snag_locale', 'xx')
            ->get(route('login'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/Login')
                ->where('localization.locale', config('app.locale')));
    }
}
