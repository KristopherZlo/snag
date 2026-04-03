<?php

namespace Tests\Feature\Auth;

use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Tests\TestCase;

class SanctumStatefulRequestHostTest extends TestCase
{
    public function test_current_request_host_is_treated_as_stateful_frontend_origin(): void
    {
        config(['app.url' => 'http://localhost/snag']);

        $request = Request::create(
            'http://192.168.43.122/snag/api/v1/reports/1',
            'DELETE',
            [],
            [],
            [],
            [
                'HTTP_REFERER' => 'http://192.168.43.122/snag/dashboard',
            ],
        );

        $this->assertTrue(EnsureFrontendRequestsAreStateful::fromFrontend($request));
    }
}
