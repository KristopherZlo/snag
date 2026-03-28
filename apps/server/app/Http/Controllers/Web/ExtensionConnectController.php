<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Services\Auth\ExtensionConnectService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExtensionConnectController extends Controller
{
    public function show(Request $request, ExtensionConnectService $connectService): Response
    {
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');

        return Inertia::render('Extension/Connect', [
            'code' => $connectService->issue($request->user(), $organization),
            'expiresInMinutes' => (int) config('snag.capture.extension_code_ttl_minutes'),
            'apiBaseUrl' => url('/'),
        ]);
    }
}
