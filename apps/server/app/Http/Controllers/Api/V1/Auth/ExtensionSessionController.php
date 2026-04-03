<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\ExtensionSessionService;
use Illuminate\Http\Request;

class ExtensionSessionController extends Controller
{
    public function destroy(Request $request, ExtensionSessionService $sessions)
    {
        $user = $request->user();
        $token = $user?->currentAccessToken();

        if (! $user || ! $token) {
            abort(403, 'extension_session_required');
        }

        $sessions->revokeCurrentSession($user, $token);

        return response()->noContent();
    }
}
