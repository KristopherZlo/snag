<?php

namespace App\Http\Controllers\Api\V1\Billing;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Billing\CheckoutRequest;
use App\Models\Organization;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\RedirectResponse;

class BillingPortalController extends Controller
{
    public function checkout(CheckoutRequest $request)
    {
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');
        $this->ensureManagerRole($organization, $request->user()->id);
        $priceId = config('snag.billing.stripe.prices.'.$request->string('plan'));

        abort_unless($priceId, 422, 'billing_disabled');

        /** @var RedirectResponse $response */
        $response = $organization->newSubscription('default', $priceId)->checkout([
            'success_url' => route('settings.billing'),
            'cancel_url' => route('settings.billing'),
        ]);

        return response()->json([
            'checkout_url' => $response->getTargetUrl(),
        ]);
    }

    public function portal(Request $request)
    {
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');
        $this->ensureManagerRole($organization, $request->user()->id);

        abort_unless($organization->stripe_id, 422, 'billing_disabled');

        return response()->json([
            'portal_url' => $organization->billingPortalUrl(route('settings.billing')),
        ]);
    }

    private function ensureManagerRole(Organization $organization, int $userId): void
    {
        $allowed = $organization->memberships()
            ->where('user_id', $userId)
            ->whereIn('role', ['owner', 'admin'])
            ->exists();

        abort_unless($allowed, 403);
    }
}
