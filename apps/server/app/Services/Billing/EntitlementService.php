<?php

namespace App\Services\Billing;

use App\Enums\BillingPlan;
use App\Models\Organization;
use Illuminate\Validation\ValidationException;

class EntitlementService
{
    public function snapshot(Organization $organization): array
    {
        $plan = $organization->subscriptionState()->first()?->plan ?? BillingPlan::Free;
        $limits = config("snag.billing.plans.{$plan->value}", config('snag.billing.plans.free'));

        return [
            'plan' => $plan->value,
            'members' => $limits['members'],
            'video_seconds' => $limits['video_seconds'],
            'can_record_video' => $limits['can_record_video'],
        ];
    }

    public function assertCanInviteMember(Organization $organization): void
    {
        $snapshot = $this->snapshot($organization);

        if ($organization->memberships()->count() >= $snapshot['members']) {
            throw ValidationException::withMessages([
                'organization' => 'entitlement_exceeded',
            ]);
        }
    }

    public function assertMediaAllowed(Organization $organization, string $mediaKind, ?int $durationSeconds = null): void
    {
        $snapshot = $this->snapshot($organization);

        if ($mediaKind === 'video' && ! $snapshot['can_record_video']) {
            throw ValidationException::withMessages([
                'media_kind' => 'entitlement_exceeded',
            ]);
        }

        if ($mediaKind === 'video' && $durationSeconds !== null && $durationSeconds > $snapshot['video_seconds']) {
            throw ValidationException::withMessages([
                'media_duration_seconds' => 'entitlement_exceeded',
            ]);
        }
    }
}
