<?php

namespace Tests\Feature\Reports;

use App\Models\BugReport;
use App\Models\CaptureKey;
use App\Models\User;
use App\Support\HashedToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class PublicCaptureFlowTest extends TestCase
{
    use CreatesOrganizations;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::disk('local')->deleteDirectory('org');
    }

    protected function tearDown(): void
    {
        Storage::disk('local')->deleteDirectory('org');

        parent::tearDown();
    }

    public function test_public_capture_flow_creates_ready_public_report(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganizationFor($owner);
        $captureKey = CaptureKey::query()->create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'name' => 'Widget key',
            'public_key' => 'pk_test_capture_key',
            'relay_secret' => 'relay-secret-browser-flow',
            'status' => 'active',
            'allowed_origins' => ['https://widget.example.com'],
        ]);

        $createToken = $this->withHeader('Origin', 'https://widget.example.com')->postJson(route('api.v1.public.capture.token'), [
            'public_key' => $captureKey->public_key,
            'origin' => 'https://widget.example.com',
            'action' => 'create',
        ])->assertOk()->json('capture_token');

        $create = $this->withHeader('Origin', 'https://widget.example.com')->postJson(route('api.v1.public.capture.create'), [
            'public_key' => $captureKey->public_key,
            'origin' => 'https://widget.example.com',
            'capture_token' => $createToken,
            'media_kind' => 'screenshot',
            'meta' => ['embed' => true],
        ]);

        $create->assertOk()->assertJsonCount(2, 'artifacts');

        foreach ($create->json('artifacts') as $artifact) {
            Storage::disk('local')->put(
                $artifact['key'],
                $artifact['kind'] === 'debugger'
                    ? json_encode(['logs' => [['level' => 'info', 'message' => 'Widget rendered.']]], JSON_THROW_ON_ERROR)
                    : 'fake-png-binary'
            );
        }

        $finalizeToken = $this->withHeader('Origin', 'https://widget.example.com')->postJson(route('api.v1.public.capture.token'), [
            'public_key' => $captureKey->public_key,
            'origin' => 'https://widget.example.com',
            'action' => 'finalize',
        ])->assertOk()->json('capture_token');

        $finalize = $this->withHeader('Origin', 'https://widget.example.com')->postJson(route('api.v1.public.capture.finalize'), [
            'public_key' => $captureKey->public_key,
            'origin' => 'https://widget.example.com',
            'capture_token' => $finalizeToken,
            'upload_session_token' => $create->json('upload_session_token'),
            'finalize_token' => $create->json('finalize_token'),
            'title' => 'Widget report',
            'visibility' => 'public',
        ]);

        $finalize->assertOk()
            ->assertJsonPath('report.status', 'processing')
            ->assertJsonPath('report.report_url', null);

        $report = BugReport::query()->firstOrFail();

        $this->assertSame($captureKey->id, $report->capture_key_id);
        $this->assertSame('ready', $report->status->value);
        $this->assertSame(
            $report->share_token,
            HashedToken::hash((string) str($finalize->json('report.share_url'))->afterLast('/')),
        );
        $this->get($finalize->json('report.share_url'))->assertOk();
    }

    public function test_public_capture_token_rejects_forbidden_origin(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganizationFor($owner);

        CaptureKey::query()->create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'name' => 'Widget key',
            'public_key' => 'pk_test_origin_guard',
            'relay_secret' => 'relay-secret-origin-guard',
            'status' => 'active',
            'allowed_origins' => ['https://widget.example.com'],
        ]);

        $this->withHeader('Origin', 'https://evil.example.com')->postJson(route('api.v1.public.capture.token'), [
            'public_key' => 'pk_test_origin_guard',
            'origin' => 'https://widget.example.com',
            'action' => 'create',
        ])->assertForbidden();
    }

    public function test_public_capture_token_allows_same_origin_frontend_requests_without_csrf_token(): void
    {
        config(['app.url' => 'http://localhost/snag']);

        $owner = User::factory()->create();
        $organization = $this->createOrganizationFor($owner);

        CaptureKey::query()->create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'name' => 'Widget key',
            'public_key' => 'pk_test_same_origin_widget',
            'relay_secret' => 'relay-secret-same-origin',
            'status' => 'active',
            'allowed_origins' => ['http://localhost'],
        ]);

        $this->withHeader('Referer', 'http://localhost/snag/_diagnostics/capture-widget')
            ->postJson(route('api.v1.public.capture.token'), [
                'public_key' => 'pk_test_same_origin_widget',
                'origin' => 'http://localhost',
                'action' => 'create',
            ])
            ->assertOk()
            ->assertJsonStructure(['capture_token']);
    }

    public function test_public_capture_finalize_accepts_org_visibility_alias(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganizationFor($owner);
        $captureKey = CaptureKey::query()->create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'name' => 'Widget key',
            'public_key' => 'pk_test_org_alias',
            'relay_secret' => 'relay-secret-org-alias',
            'status' => 'active',
            'allowed_origins' => ['https://widget.example.com'],
        ]);

        $createToken = $this->withHeader('Origin', 'https://widget.example.com')->postJson(route('api.v1.public.capture.token'), [
            'public_key' => $captureKey->public_key,
            'origin' => 'https://widget.example.com',
            'action' => 'create',
        ])->assertOk()->json('capture_token');

        $create = $this->withHeader('Origin', 'https://widget.example.com')->postJson(route('api.v1.public.capture.create'), [
            'public_key' => $captureKey->public_key,
            'origin' => 'https://widget.example.com',
            'capture_token' => $createToken,
            'media_kind' => 'screenshot',
        ]);

        foreach ($create->json('artifacts') as $artifact) {
            Storage::disk('local')->put(
                $artifact['key'],
                $artifact['kind'] === 'debugger'
                    ? json_encode(['logs' => []], JSON_THROW_ON_ERROR)
                    : 'fake-png-binary'
            );
        }

        $finalizeToken = $this->withHeader('Origin', 'https://widget.example.com')->postJson(route('api.v1.public.capture.token'), [
            'public_key' => $captureKey->public_key,
            'origin' => 'https://widget.example.com',
            'action' => 'finalize',
        ])->assertOk()->json('capture_token');

        $finalize = $this->withHeader('Origin', 'https://widget.example.com')->postJson(route('api.v1.public.capture.finalize'), [
            'public_key' => $captureKey->public_key,
            'origin' => 'https://widget.example.com',
            'capture_token' => $finalizeToken,
            'upload_session_token' => $create->json('upload_session_token'),
            'finalize_token' => $create->json('finalize_token'),
            'title' => 'Organization-only widget report',
            'visibility' => 'org',
        ]);

        $finalize->assertOk()
            ->assertJsonPath('report.report_url', null)
            ->assertJsonPath('report.share_url', null);

        $report = BugReport::query()->firstOrFail();

        $this->assertSame('organization', $report->visibility->value);
    }

    public function test_relay_mode_accepts_signed_public_capture_requests_without_browser_origin_headers(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganizationFor($owner);
        $captureKey = CaptureKey::query()->create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'name' => 'Relay key',
            'public_key' => 'pk_test_relay_widget',
            'relay_secret' => 'relay-secret-signed-mode',
            'status' => 'active',
            'allowed_origins' => ['https://widget.example.com'],
        ]);

        $createTimestamp = (string) now()->timestamp;
        $createSignature = $this->relaySignature($captureKey, 'https://widget.example.com', 'create', $createTimestamp);

        $createToken = $this->withHeaders([
            'X-Snag-Relay-Timestamp' => $createTimestamp,
            'X-Snag-Relay-Signature' => $createSignature,
        ])->postJson(route('api.v1.public.capture.token'), [
            'public_key' => $captureKey->public_key,
            'origin' => 'https://widget.example.com',
            'mode' => 'relay',
            'action' => 'create',
        ])->assertOk()->json('capture_token');

        $create = $this->withHeaders([
            'X-Snag-Relay-Timestamp' => $createTimestamp,
            'X-Snag-Relay-Signature' => $createSignature,
        ])->postJson(route('api.v1.public.capture.create'), [
            'public_key' => $captureKey->public_key,
            'origin' => 'https://widget.example.com',
            'mode' => 'relay',
            'capture_token' => $createToken,
            'media_kind' => 'screenshot',
        ])->assertOk();

        foreach ($create->json('artifacts') as $artifact) {
            Storage::disk('local')->put(
                $artifact['key'],
                $artifact['kind'] === 'debugger'
                    ? json_encode(['logs' => []], JSON_THROW_ON_ERROR)
                    : 'fake-png-binary'
            );
        }

        $finalizeTimestamp = (string) (now()->timestamp + 1);
        $finalizeSignature = $this->relaySignature($captureKey, 'https://widget.example.com', 'finalize', $finalizeTimestamp);

        $finalizeToken = $this->withHeaders([
            'X-Snag-Relay-Timestamp' => $finalizeTimestamp,
            'X-Snag-Relay-Signature' => $finalizeSignature,
        ])->postJson(route('api.v1.public.capture.token'), [
            'public_key' => $captureKey->public_key,
            'origin' => 'https://widget.example.com',
            'mode' => 'relay',
            'action' => 'finalize',
        ])->assertOk()->json('capture_token');

        $this->withHeaders([
            'X-Snag-Relay-Timestamp' => $finalizeTimestamp,
            'X-Snag-Relay-Signature' => $finalizeSignature,
        ])->postJson(route('api.v1.public.capture.finalize'), [
            'public_key' => $captureKey->public_key,
            'origin' => 'https://widget.example.com',
            'mode' => 'relay',
            'capture_token' => $finalizeToken,
            'upload_session_token' => $create->json('upload_session_token'),
            'finalize_token' => $create->json('finalize_token'),
            'title' => 'Relay widget report',
            'visibility' => 'organization',
        ])->assertOk();
    }

    private function relaySignature(CaptureKey $captureKey, string $origin, string $action, string $timestamp): string
    {
        return 'sha256='.hash_hmac(
            'sha256',
            implode('.', [$timestamp, $captureKey->public_key, $origin, $action]),
            (string) $captureKey->relay_secret,
        );
    }
}
