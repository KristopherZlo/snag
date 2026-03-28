<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\ExtensionTokenExchangeRequest;
use App\Services\Auth\ExtensionConnectService;

class ExtensionTokenExchangeController extends Controller
{
    public function store(ExtensionTokenExchangeRequest $request, ExtensionConnectService $connectService)
    {
        return response()->json(
            $connectService->exchange(
                $request->string('code')->toString(),
                $request->string('device_name')->toString(),
            )
        );
    }
}
