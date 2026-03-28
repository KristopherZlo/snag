<?php

namespace App\Http\Controllers\Api\V1\Billing;

use App\Http\Controllers\Controller;
use App\Services\Billing\StripeWebhookService;
use Illuminate\Http\Request;

class BillingWebhookController extends Controller
{
    public function __invoke(Request $request, StripeWebhookService $webhooks)
    {
        $event = $webhooks->handle($request);

        return response()->json([
            'status' => $event->status,
        ]);
    }
}
