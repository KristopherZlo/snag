<?php

namespace Tests\Unit\Billing;

use App\Enums\BillingPlan;
use App\Models\User;
use App\Services\Billing\EntitlementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class EntitlementServiceTest extends TestCase
{
    use CreatesOrganizations;
    use RefreshDatabase;

    public function test_free_plan_blocks_video_recording(): void
    {
        $service = app(EntitlementService::class);
        $organization = $this->createOrganizationFor(User::factory()->create(), BillingPlan::Free);

        try {
            $service->assertMediaAllowed($organization, 'video', 30);
            $this->fail('Expected entitlement exception was not thrown.');
        } catch (ValidationException $exception) {
            $this->assertSame('entitlement_exceeded', $exception->errors()['media_kind'][0]);
        }
    }

    public function test_member_limit_is_enforced(): void
    {
        $service = app(EntitlementService::class);
        $owner = User::factory()->create();
        $organization = $this->createOrganizationFor($owner, BillingPlan::Free);

        $this->addMembership($organization, User::factory()->create());
        $this->addMembership($organization, User::factory()->create());

        try {
            $service->assertCanInviteMember($organization);
            $this->fail('Expected member limit exception was not thrown.');
        } catch (ValidationException $exception) {
            $this->assertSame('entitlement_exceeded', $exception->errors()['organization'][0]);
        }
    }
}
