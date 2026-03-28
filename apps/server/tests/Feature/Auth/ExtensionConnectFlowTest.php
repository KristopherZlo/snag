<?php

namespace Tests\Feature\Auth;

use App\Models\ExtensionConnectCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class ExtensionConnectFlowTest extends TestCase
{
    use CreatesOrganizations;
    use RefreshDatabase;

    public function test_user_can_issue_extension_code_and_exchange_it_once(): void
    {
        $user = User::factory()->create();
        $organization = $this->createOrganizationFor($user);

        $response = $this->actingAs($user)->get(route('settings.extension.connect'));

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Extension/Connect')
            ->has('code')
            ->where('expiresInMinutes', (int) config('snag.capture.extension_code_ttl_minutes')));

        $code = $response->inertiaProps('code');

        $exchange = $this->postJson(route('api.v1.extension.exchange'), [
            'code' => $code,
            'device_name' => 'Chrome Recorder',
        ]);

        $exchange->assertOk()
            ->assertJsonPath('organization.id', $organization->id)
            ->assertJsonPath('user.id', $user->id);

        $record = ExtensionConnectCode::query()->firstOrFail();

        $this->assertNotNull($record->consumed_at);
        $this->assertNotEmpty($exchange->json('token'));

        $this->postJson(route('api.v1.extension.exchange'), [
            'code' => $code,
            'device_name' => 'Chrome Recorder',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);
    }

    public function test_exchanged_extension_token_can_access_authenticated_report_routes(): void
    {
        $user = User::factory()->create();
        $this->createOrganizationFor($user);

        $response = $this->actingAs($user)->get(route('settings.extension.connect'));
        $code = $response->inertiaProps('code');

        $exchange = $this->postJson(route('api.v1.extension.exchange'), [
            'code' => $code,
            'device_name' => 'Chrome Recorder',
        ]);

        $token = $exchange->json('token');

        $this->assertNotEmpty($token);
        $this->assertNotNull(PersonalAccessToken::findToken($token));

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson(route('api.v1.reports.upload-session'), [
                'media_kind' => 'screenshot',
                'meta' => ['source' => 'extension-test'],
            ])
            ->assertOk()
            ->assertJsonStructure([
                'upload_session_token',
                'finalize_token',
                'artifacts',
            ]);
    }
}
