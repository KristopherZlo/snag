<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Services\Auth\ExtensionConnectService;
use App\Services\Auth\ExtensionSessionService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ExtensionConnectController extends Controller
{
    public function show(
        Request $request,
        ExtensionConnectService $connectService,
        ExtensionSessionService $sessions,
    ): Response
    {
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');

        return Inertia::render('Extension/Connect', [
            'code' => $connectService->issue($request->user(), $organization),
            'expiresInMinutes' => (int) config('snag.capture.extension_code_ttl_minutes'),
            'tokenExpiresInMinutes' => (int) config('snag.capture.extension_token_ttl_minutes'),
            'apiBaseUrl' => url('/'),
            'sessions' => $sessions->sessionsFor($request->user()),
        ]);
    }

    public function destroySession(Request $request, int $tokenId, ExtensionSessionService $sessions): RedirectResponse
    {
        $sessions->revokeById($request->user(), $tokenId);

        return redirect()->route('settings.extension.connect');
    }
}
