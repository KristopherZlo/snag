<?php

namespace Tests\Feature\Localization;

use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LocalizationPreferenceTest extends TestCase
{
    public function test_locale_switch_route_sets_cookie_and_redirects_back(): void
    {
        $response = $this->get('/locale/de?redirect=/login');

        $response
            ->assertRedirect('/login')
            ->assertCookie('snag_locale', 'de');
    }

    public function test_locale_switch_route_falls_back_for_invalid_locale(): void
    {
        $response = $this->get('/locale/xx?redirect=/login');

        $response
            ->assertRedirect('/login')
            ->assertCookie('snag_locale', config('app.locale'));
    }

    public function test_locale_switch_route_does_not_duplicate_the_xampp_base_path_in_redirects(): void
    {
        $response = $this->call('GET', '/locale/de', [
            'redirect' => '/snag/dashboard',
        ], [], [], [
            'SCRIPT_NAME' => '/snag/index.php',
            'SCRIPT_FILENAME' => dirname(base_path(), 2).DIRECTORY_SEPARATOR.'index.php',
            'PHP_SELF' => '/snag/index.php',
            'REQUEST_URI' => '/snag/locale/de?redirect=/snag/dashboard',
            'QUERY_STRING' => 'redirect=/snag/dashboard',
            'HTTP_HOST' => 'localhost',
            'SERVER_NAME' => 'localhost',
            'SERVER_PORT' => 80,
            'REQUEST_SCHEME' => 'http',
            'HTTPS' => 'off',
        ]);

        $response
            ->assertRedirect('http://localhost/snag/dashboard')
            ->assertCookie('snag_locale', 'de');
    }

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
