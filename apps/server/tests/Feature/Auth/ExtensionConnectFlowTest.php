<?php

namespace Tests\Feature\Auth;

use App\Models\ExtensionConnectCode;
use App\Models\User;
use App\Services\Auth\ExtensionConnectService;
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
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('device_name', 'Chrome Recorder');

        $record = ExtensionConnectCode::query()->firstOrFail();
        $token = PersonalAccessToken::findToken($exchange->json('token'));

        $this->assertNotNull($record->consumed_at);
        $this->assertNotEmpty($exchange->json('token'));
        $this->assertNotNull($token);
        $this->assertNotNull($token->expires_at);
        $this->assertSame('Chrome Recorder', $exchange->json('device_name'));
        $this->assertSame($token->expires_at?->toIso8601String(), $exchange->json('expires_at'));

        $this->postJson(route('api.v1.extension.exchange'), [
            'code' => $code,
            'device_name' => 'Chrome Recorder',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);
    }

    public function test_exchanged_extension_token_can_access_authenticated_report_routes(): void
    {
        $user = User::factory()->create();
        $organization = $this->createOrganizationFor($user);

        $code = app(ExtensionConnectService::class)->issue($user, $organization);

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

    public function test_exchanged_extension_token_cannot_manage_workspace_api_surfaces(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $organization = $this->createOrganizationFor($user);

        $code = app(ExtensionConnectService::class)->issue($user, $organization);

        $exchange = $this->postJson(route('api.v1.extension.exchange'), [
            'code' => $code,
            'device_name' => 'Chrome Recorder',
        ]);

        $token = $exchange->json('token');

        $this->assertNotEmpty($token);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson(route('api.v1.issues.store'), [
                'title' => 'Should not be allowed',
                'workflow_state' => 'inbox',
                'urgency' => 'medium',
                'resolution' => 'unresolved',
            ])
            ->assertForbidden();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('capture-keys.index'))
            ->assertForbidden();
    }

    public function test_reconnecting_same_device_name_invalidates_previous_extension_session(): void
    {
        $user = User::factory()->create();
        $organization = $this->createOrganizationFor($user);

        $firstCode = app(ExtensionConnectService::class)->issue($user, $organization);
        $firstExchange = $this->postJson(route('api.v1.extension.exchange'), [
            'code' => $firstCode,
            'device_name' => 'Chrome Recorder',
        ]);
        $firstToken = $firstExchange->json('token');

        $secondCode = app(ExtensionConnectService::class)->issue($user, $organization);
        $secondExchange = $this->postJson(route('api.v1.extension.exchange'), [
            'code' => $secondCode,
            'device_name' => 'Chrome Recorder',
        ]);
        $secondToken = $secondExchange->json('token');

        $this->assertNotNull($firstToken);
        $this->assertNotNull($secondToken);
        $this->assertNull(PersonalAccessToken::findToken($firstToken));
        $this->assertNotNull(PersonalAccessToken::findToken($secondToken));

        $this->withHeader('Authorization', 'Bearer '.$firstToken)
            ->postJson(route('api.v1.reports.upload-session'), [
                'media_kind' => 'screenshot',
            ])
            ->assertUnauthorized();

        $this->assertSame(1, $user->fresh()->tokens()->count());
    }

    public function test_extension_token_expires_after_configured_ttl(): void
    {
        config()->set('snag.capture.extension_token_ttl_minutes', 1);

        $user = User::factory()->create();
        $organization = $this->createOrganizationFor($user);
        $code = app(ExtensionConnectService::class)->issue($user, $organization);

        $exchange = $this->postJson(route('api.v1.extension.exchange'), [
            'code' => $code,
            'device_name' => 'Chrome Recorder',
        ]);

        $token = $exchange->json('token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson(route('api.v1.reports.upload-session'), [
                'media_kind' => 'screenshot',
            ])
            ->assertOk();

        $this->travel(2)->minutes();
        app('auth')->forgetGuards();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson(route('api.v1.reports.upload-session'), [
                'media_kind' => 'screenshot',
            ])
            ->assertUnauthorized();
    }

    public function test_extension_token_can_revoke_its_current_session(): void
    {
        $user = User::factory()->create();
        $organization = $this->createOrganizationFor($user);
        $code = app(ExtensionConnectService::class)->issue($user, $organization);

        $exchange = $this->postJson(route('api.v1.extension.exchange'), [
            'code' => $code,
            'device_name' => 'Chrome Recorder',
        ]);

        $token = $exchange->json('token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson(route('api.v1.extension.session.destroy'))
            ->assertNoContent();

        $this->assertNull(PersonalAccessToken::findToken($token));
        app('auth')->forgetGuards();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson(route('api.v1.reports.upload-session'), [
                'media_kind' => 'screenshot',
            ])
            ->assertUnauthorized();
    }

    public function test_extension_exchange_is_rate_limited_after_repeated_invalid_attempts(): void
    {
        config()->set('snag.capture.extension_exchange.max_attempts', 3);
        config()->set('snag.capture.extension_exchange.decay_seconds', 60);

        foreach (range(1, 3) as $_) {
            $this->postJson(route('api.v1.extension.exchange'), [
                'code' => 'INVALID12',
                'device_name' => 'Chrome Recorder',
            ])->assertUnprocessable();
        }

        $this->postJson(route('api.v1.extension.exchange'), [
            'code' => 'INVALID12',
            'device_name' => 'Chrome Recorder',
        ])->assertStatus(429);
    }

    public function test_user_can_review_and_revoke_extension_sessions_from_settings(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $organization = $this->createOrganizationFor($user);
        $code = app(ExtensionConnectService::class)->issue($user, $organization);

        $exchange = $this->postJson(route('api.v1.extension.exchange'), [
            'code' => $code,
            'device_name' => 'QA Laptop',
        ]);
        $token = PersonalAccessToken::findToken($exchange->json('token'));

        $this->assertNotNull($token);

        $this->actingAs($user)
            ->get(route('settings.extension.connect'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Extension/Connect')
                ->where('sessions.0.device_name', 'QA Laptop')
                ->where('sessions.0.id', $token->getKey()));

        $this->actingAs($user)
            ->delete(route('settings.extension.sessions.destroy', $token->getKey()))
            ->assertRedirect(route('settings.extension.connect'));

        $this->assertNull($token->fresh());
    }
}
