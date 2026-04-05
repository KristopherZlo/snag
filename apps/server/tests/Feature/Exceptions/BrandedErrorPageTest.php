<?php

namespace Tests\Feature\Exceptions;

use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Tests\TestCase;

class BrandedErrorPageTest extends TestCase
{
    public function test_missing_web_routes_render_the_branded_error_page(): void
    {
        $this->get('/this-page-does-not-exist')
            ->assertStatus(404)
            ->assertInertia(fn (Assert $page) => $page
                ->component('Error')
                ->where('status', 404));
    }

    public function test_server_errors_render_the_branded_error_page(): void
    {
        Route::middleware('web')->get('/_test/error-500', function () {
            throw new RuntimeException('Boom');
        });

        $this->get('/_test/error-500')
            ->assertStatus(500)
            ->assertInertia(fn (Assert $page) => $page
                ->component('Error')
                ->where('status', 500));
    }

    public function test_expired_pages_redirect_back_with_a_status_message(): void
    {
        Route::middleware('web')->post('/_test/error-419', function () {
            abort(419);
        });

        $this->from('/login')
            ->post('/_test/error-419')
            ->assertRedirect('/login')
            ->assertSessionHas('status', 'The page expired. Please try again.');
    }
}
