<?php

namespace Tests\Feature\Reports;

use App\Enums\BillingPlan;
use App\Models\BugReport;
use App\Models\User;
use App\Support\HashedToken;
use Illuminate\Http\Request;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class AuthenticatedReportFlowTest extends TestCase
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

    public function test_authenticated_user_can_create_finalize_and_share_a_report(): void
    {
        $user = User::factory()->create();
        $organization = $this->createOrganizationFor($user);

        Sanctum::actingAs($user, ['reports:create']);

        $create = $this->postJson(route('api.v1.reports.upload-session'), [
            'media_kind' => 'screenshot',
            'meta' => ['source' => 'phpunit'],
        ]);

        $create->assertOk()->assertJsonCount(2, 'artifacts');

        foreach ($create->json('artifacts') as $artifact) {
            Storage::disk('local')->put(
                $artifact['key'],
                $artifact['kind'] === 'debugger'
                    ? json_encode($this->debuggerPayload(), JSON_THROW_ON_ERROR)
                    : 'fake-png-binary'
            );
        }

        $finalize = $this->postJson(route('api.v1.reports.finalize'), [
            'upload_session_token' => $create->json('upload_session_token'),
            'finalize_token' => $create->json('finalize_token'),
            'title' => 'Public screenshot report',
            'summary' => 'Regression captured by automated test.',
            'visibility' => 'public',
        ]);

        $finalize->assertOk()
            ->assertJsonPath('report.status', 'processing');

        $report = BugReport::query()
            ->with(['artifacts', 'debuggerActions', 'debuggerLogs', 'debuggerNetworkRequests'])
            ->firstOrFail();

        $this->assertSame($organization->id, $report->organization_id);
        $this->assertSame('ready', $report->status->value);
        $this->assertCount(2, $report->artifacts);
        $this->assertCount(1, $report->debuggerActions);
        $this->assertCount(1, $report->debuggerLogs);
        $this->assertCount(1, $report->debuggerNetworkRequests);
        $this->assertSame('https://app.snag.io/', $report->meta['debugger']['context']['url'] ?? null);
        $this->assertSame('none', $report->meta['debugger']['meta']['priority'] ?? null);
        $this->assertSame(route('reports.show', $report), $finalize->json('report.report_url'));
        $this->assertNotNull($finalize->json('report.share_url'));
        $this->assertSame(
            $report->share_token,
            HashedToken::hash((string) str($finalize->json('report.share_url'))->afterLast('/')),
        );

        $this->get(route('reports.show', $report))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Reports/Show')
                ->where('report.share_url', null)
                ->where('report.has_public_share', true)
                ->where('report.debugger_context.url', 'https://app.snag.io/')
                ->where('report.debugger_meta.priority', 'none')
                ->has('report.debugger.actions', 1)
                ->has('report.debugger.logs', 1)
                ->has('report.debugger.network_requests', 1));

        $this->get($finalize->json('report.share_url'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Reports/Share')
                ->where('report.title', 'Public screenshot report')
                ->has('report.artifacts', 2)
                ->has('report.debugger.actions', 1)
                ->has('report.debugger.logs', 1)
                ->has('report.debugger.network_requests', 1));
    }

    public function test_local_temporary_upload_url_respects_the_application_base_path(): void
    {
        config(['app.url' => 'http://localhost/snag']);
        URL::forceRootUrl('http://localhost/snag');
        URL::forceScheme('http');

        $signed = Storage::disk('local')->temporaryUploadUrl(
            'org/1/uploads/base-path-test/capture.png',
            now()->addMinutes(15),
            ['ContentType' => 'image/png'],
        );

        $this->assertStringStartsWith(
            'http://localhost/snag/storage/org/1/uploads/base-path-test/capture.png?',
            $signed['url'],
        );
        $this->assertStringNotContainsString('/snag/snag/storage/', $signed['url']);
    }

    public function test_local_temporary_read_url_respects_the_application_base_path(): void
    {
        config(['app.url' => 'http://localhost/snag']);
        URL::forceRootUrl('http://localhost/snag');
        URL::forceScheme('http');

        $signed = Storage::disk('local')->temporaryUrl(
            'org/1/uploads/base-path-test/capture.png',
            now()->addMinutes(15),
        );

        $this->assertStringStartsWith(
            'http://localhost/snag/storage/org/1/uploads/base-path-test/capture.png?',
            $signed,
        );
        $this->assertStringNotContainsString('/snag/snag/storage/', $signed);
    }

    public function test_local_storage_signed_urls_validate_under_the_application_base_path(): void
    {
        config(['app.url' => 'http://localhost/snag']);
        URL::forceRootUrl('http://localhost/snag');
        URL::forceScheme('http');

        $downloadUrl = Storage::disk('local')->temporaryUrl(
            'org/1/uploads/base-path-test/capture.png',
            now()->addMinutes(15),
        );
        $uploadUrl = Storage::disk('local')->temporaryUploadUrl(
            'org/1/uploads/base-path-test/capture.png',
            now()->addMinutes(15),
            ['ContentType' => 'image/png'],
        )['url'];

        $this->assertTrue(URL::hasValidRelativeSignature($this->storageRequestFor($downloadUrl, 'GET')));
        $this->assertTrue(URL::hasValidRelativeSignature($this->storageRequestFor($uploadUrl, 'PUT')));
    }

    public function test_authenticated_finalize_accepts_org_visibility_alias_and_hides_public_share_url(): void
    {
        $user = User::factory()->create();
        $this->createOrganizationFor($user);

        Sanctum::actingAs($user, ['reports:create']);

        $create = $this->postJson(route('api.v1.reports.upload-session'), [
            'media_kind' => 'screenshot',
            'meta' => ['source' => 'phpunit'],
        ]);

        foreach ($create->json('artifacts') as $artifact) {
            Storage::disk('local')->put(
                $artifact['key'],
                $artifact['kind'] === 'debugger'
                    ? json_encode($this->debuggerPayload(), JSON_THROW_ON_ERROR)
                    : 'fake-png-binary'
            );
        }

        $finalize = $this->postJson(route('api.v1.reports.finalize'), [
            'upload_session_token' => $create->json('upload_session_token'),
            'finalize_token' => $create->json('finalize_token'),
            'title' => 'Organization-only report',
            'visibility' => 'org',
        ]);

        $finalize->assertOk()
            ->assertJsonPath('report.share_url', null);

        $report = BugReport::query()->firstOrFail();

        $this->assertSame('organization', $report->visibility->value);
        $this->assertNull($report->share_token);
        $this->assertSame(route('reports.show', $report), $finalize->json('report.report_url'));
    }

    public function test_authenticated_user_can_create_and_finalize_a_video_report_when_plan_allows_it(): void
    {
        $user = User::factory()->create();
        $organization = $this->createOrganizationFor($user, BillingPlan::Studio);

        Sanctum::actingAs($user, ['reports:create']);

        $create = $this->postJson(route('api.v1.reports.upload-session'), [
            'media_kind' => 'video',
            'meta' => ['source' => 'phpunit-video'],
        ]);

        $create->assertOk()->assertJsonCount(2, 'artifacts');

        foreach ($create->json('artifacts') as $artifact) {
            Storage::disk('local')->put(
                $artifact['key'],
                $artifact['kind'] === 'debugger'
                    ? json_encode($this->debuggerPayload(), JSON_THROW_ON_ERROR)
                    : 'fake-webm-binary'
            );
        }

        $finalize = $this->postJson(route('api.v1.reports.finalize'), [
            'upload_session_token' => $create->json('upload_session_token'),
            'finalize_token' => $create->json('finalize_token'),
            'title' => 'Studio video report',
            'summary' => 'Video evidence for the checkout failure.',
            'visibility' => 'organization',
            'media_duration_seconds' => 42,
        ]);

        $finalize->assertOk()
            ->assertJsonPath('report.status', 'processing')
            ->assertJsonPath('report.share_url', null);

        $report = BugReport::query()
            ->with(['artifacts', 'debuggerActions', 'debuggerLogs', 'debuggerNetworkRequests'])
            ->firstOrFail();

        $videoArtifact = $report->artifacts->firstWhere('kind', 'video');

        $this->assertSame($organization->id, $report->organization_id);
        $this->assertSame('video', $report->media_kind);
        $this->assertSame('ready', $report->status->value);
        $this->assertNull($report->share_token);
        $this->assertNotNull($videoArtifact);
        $this->assertSame(42, $videoArtifact->duration_seconds);
        $this->assertSame('video/webm', $videoArtifact->content_type);
        $this->assertCount(1, $report->debuggerActions);
        $this->assertCount(1, $report->debuggerLogs);
        $this->assertCount(1, $report->debuggerNetworkRequests);
        $this->assertNotNull($report->debuggerActions->first()?->happened_at);
        $this->assertNotNull($report->debuggerLogs->first()?->happened_at);
        $this->assertNotNull($report->debuggerNetworkRequests->first()?->happened_at);
        $this->assertSame(route('reports.show', $report), $finalize->json('report.report_url'));

        $this->get(route('reports.show', $report))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Reports/Show')
                ->where('report.share_url', null)
                ->where('report.has_public_share', false)
                ->where('report.media_kind', 'video')
                ->where('report.debugger.actions.0.happened_at', $report->debuggerActions->first()?->happened_at?->toISOString())
                ->where('report.debugger.logs.0.happened_at', $report->debuggerLogs->first()?->happened_at?->toISOString())
                ->where('report.debugger.network_requests.0.happened_at', $report->debuggerNetworkRequests->first()?->happened_at?->toISOString()));
    }

    public function test_authenticated_report_ingestion_redacts_sensitive_debugger_fields_before_storage(): void
    {
        $user = User::factory()->create();
        $this->createOrganizationFor($user);

        Sanctum::actingAs($user, ['reports:create']);

        $create = $this->postJson(route('api.v1.reports.upload-session'), [
            'media_kind' => 'screenshot',
            'meta' => [
                'source' => 'phpunit',
                'apiKey' => 'client-secret-12345678901234567890',
            ],
        ]);

        $create->assertOk();

        foreach ($create->json('artifacts') as $artifact) {
            Storage::disk('local')->put(
                $artifact['key'],
                $artifact['kind'] === 'debugger'
                    ? json_encode($this->sensitiveDebuggerPayload(), JSON_THROW_ON_ERROR)
                    : 'fake-png-binary'
            );
        }

        $finalize = $this->postJson(route('api.v1.reports.finalize'), [
            'upload_session_token' => $create->json('upload_session_token'),
            'finalize_token' => $create->json('finalize_token'),
            'title' => 'Sanitized report',
            'summary' => 'Security regression coverage.',
            'visibility' => 'organization',
        ]);

        $finalize->assertOk()
            ->assertJsonPath('report.status', 'processing')
            ->assertJsonPath('report.share_url', null);

        $report = BugReport::query()
            ->with(['artifacts', 'debuggerActions', 'debuggerLogs', 'debuggerNetworkRequests'])
            ->firstOrFail();

        $debuggerArtifact = $report->artifacts->firstWhere('kind', 'debugger');

        $this->assertNotNull($debuggerArtifact);
        $this->assertNull($report->debuggerActions->first()?->value);
        $this->assertSame('[redacted]', $report->debuggerLogs->first()?->context['authorization'] ?? null);
        $this->assertSame(
            'https://api.example.test/reports?token=%5Bredacted%5D',
            $report->debuggerNetworkRequests->first()?->url,
        );
        $this->assertSame('[redacted]', $report->debuggerNetworkRequests->first()?->request_headers['authorization'] ?? null);
        $this->assertSame('[redacted]', $report->debuggerNetworkRequests->first()?->response_headers['set-cookie'] ?? null);
        $this->assertSame('[redacted]', $report->debuggerNetworkRequests->first()?->meta['authToken'] ?? null);
        $this->assertArrayNotHasKey('selection', $report->meta['debugger']['context'] ?? []);
        $this->assertSame(
            'https://app.snag.io/?session=%5Bredacted%5D',
            $report->meta['debugger']['context']['url'] ?? null,
        );
        $this->assertSame('[redacted]', $report->meta['debugger']['meta']['apiKey'] ?? null);
        $this->assertSame('[redacted]', $report->meta['session_meta']['apiKey'] ?? null);

        $sanitizedArtifact = json_decode(Storage::disk('local')->get($debuggerArtifact->path), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame('[redacted]', $sanitizedArtifact['logs'][0]['context']['authorization'] ?? null);
        $this->assertSame(
            'https://api.example.test/reports?token=%5Bredacted%5D',
            $sanitizedArtifact['network_requests'][0]['url'] ?? null,
        );
        $this->assertSame('[redacted]', $sanitizedArtifact['meta']['apiKey'] ?? null);

        $this->get(route('reports.show', $report))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Reports/Show')
                ->where('report.debugger.actions.0.value', null)
                ->where('report.debugger.logs.0.context.authorization', '[redacted]')
                ->where('report.debugger.network_requests.0.request_headers.authorization', '[redacted]')
                ->where('report.debugger_context.url', 'https://app.snag.io/?session=%5Bredacted%5D'));
    }

    /**
     * @return array<string, mixed>
     */
    private function debuggerPayload(): array
    {
        return [
            'actions' => [
                [
                    'type' => 'click',
                    'label' => 'Submit',
                    'selector' => '#submit',
                    'happened_at' => now()->toIso8601String(),
                ],
            ],
            'logs' => [
                [
                    'level' => 'error',
                    'message' => 'Console exploded.',
                    'context' => ['code' => 'E_CAPTURE'],
                    'happened_at' => now()->toIso8601String(),
                ],
            ],
            'networkRequests' => [
            ],
            'network_requests' => [
                [
                    'method' => 'POST',
                    'url' => 'https://api.example.test/reports',
                    'status_code' => 500,
                    'duration_ms' => 241,
                    'request_headers' => ['content-type' => 'application/json'],
                    'response_headers' => ['x-trace-id' => 'trace-123'],
                    'meta' => ['host' => 'api.example.test'],
                    'happened_at' => now()->toIso8601String(),
                ],
            ],
            'context' => [
                'url' => 'https://app.snag.io/',
                'user_agent' => 'Mozilla/5.0',
                'platform' => 'MacIntel',
                'viewport' => ['width' => 2517, 'height' => 1373],
            ],
            'meta' => [
                'priority' => 'none',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function sensitiveDebuggerPayload(): array
    {
        return [
            'actions' => [
                [
                    'type' => 'input',
                    'label' => 'Type into field',
                    'selector' => '#api-token',
                    'value' => 'secret-token-12345678901234567890',
                    'payload' => [
                        'field_length' => 31,
                        'event_count' => 1,
                        'apiKey' => 'payload-secret-12345678901234567890',
                    ],
                    'happened_at' => now()->toIso8601String(),
                ],
            ],
            'logs' => [
                [
                    'level' => 'error',
                    'message' => 'Authorization Bearer abcdefghijklmnopqrstuvwx123456 failed.',
                    'context' => [
                        'authorization' => 'Bearer abcdefghijklmnopqrstuvwx123456',
                        'trace' => 'trace-visible',
                    ],
                    'happened_at' => now()->toIso8601String(),
                ],
            ],
            'network_requests' => [
                [
                    'method' => 'POST',
                    'url' => 'https://api.example.test/reports?token=secret-token-12345678901234567890',
                    'status_code' => 500,
                    'duration_ms' => 241,
                    'request_headers' => [
                        'authorization' => 'Bearer abcdefghijklmnopqrstuvwx123456',
                        'content-type' => 'application/json',
                    ],
                    'response_headers' => [
                        'set-cookie' => 'sid=super-secret-cookie',
                        'x-trace-id' => 'trace-123',
                    ],
                    'meta' => [
                        'authToken' => 'secret-token-12345678901234567890',
                        'host' => 'api.example.test',
                    ],
                    'happened_at' => now()->toIso8601String(),
                ],
            ],
            'context' => [
                'url' => 'https://app.snag.io/?session=secret-token-12345678901234567890',
                'user_agent' => 'Mozilla/5.0',
                'platform' => 'MacIntel',
                'viewport' => ['width' => 2517, 'height' => 1373],
                'selection' => 'do not store this selection',
            ],
            'meta' => [
                'priority' => 'none',
                'apiKey' => 'meta-secret-12345678901234567890',
            ],
        ];
    }

    private function storageRequestFor(string $url, string $method): Request
    {
        $path = (string) parse_url($url, PHP_URL_PATH);
        $query = (string) parse_url($url, PHP_URL_QUERY);

        return Request::create(
            $url,
            $method,
            [],
            [],
            [],
            [
                'SCRIPT_NAME' => '/snag/index.php',
                'SCRIPT_FILENAME' => dirname(base_path(), 2).DIRECTORY_SEPARATOR.'index.php',
                'PHP_SELF' => '/snag/index.php',
                'REQUEST_URI' => $path.($query !== '' ? '?'.$query : ''),
                'QUERY_STRING' => $query,
                'HTTP_HOST' => 'localhost',
                'SERVER_NAME' => 'localhost',
                'SERVER_PORT' => 80,
                'REQUEST_SCHEME' => 'http',
                'HTTPS' => 'off',
            ],
        );
    }
}
