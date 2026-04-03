<?php

namespace Tests\Feature\Reports;

use App\Models\CaptureKey;
use App\Models\UploadSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class PublicCaptureCleanupCommandTest extends TestCase
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

    public function test_cleanup_command_purges_expired_orphaned_public_capture_sessions_and_artifacts(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganizationFor($owner);
        $captureKey = CaptureKey::query()->create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'name' => 'Cleanup key',
            'public_key' => 'pk_test_cleanup_key',
            'relay_secret' => 'relay-secret-cleanup',
            'status' => 'active',
            'allowed_origins' => ['https://widget.example.com'],
        ]);

        $session = UploadSession::query()->create([
            'organization_id' => $organization->id,
            'capture_key_id' => $captureKey->id,
            'token' => 'cleanupsessiontoken1234567890abcd',
            'finalize_token' => 'cleanupfinalizetoken1234567890abcdefghijklmn',
            'mode' => 'public',
            'media_kind' => 'screenshot',
            'status' => 'pending',
            'allowed_origin' => 'https://widget.example.com',
            'artifacts' => [
                [
                    'kind' => 'screenshot',
                    'key' => "org/{$organization->id}/uploads/cleanupsessiontoken1234567890abcd/capture.png",
                    'content_type' => 'image/png',
                ],
                [
                    'kind' => 'debugger',
                    'key' => "org/{$organization->id}/uploads/cleanupsessiontoken1234567890abcd/debugger.json",
                    'content_type' => 'application/json',
                ],
            ],
            'meta' => [],
            'expires_at' => now()->subHour(),
        ]);

        foreach ($session->artifacts as $artifact) {
            Storage::disk('local')->put($artifact['key'], 'stale-artifact');
        }

        $this->artisan('snag:cleanup-public-captures')->assertSuccessful();

        $this->assertDatabaseMissing('upload_sessions', [
            'id' => $session->id,
        ]);

        Storage::disk('local')->assertMissing("org/{$organization->id}/uploads/cleanupsessiontoken1234567890abcd/capture.png");
        Storage::disk('local')->assertMissing("org/{$organization->id}/uploads/cleanupsessiontoken1234567890abcd/debugger.json");
    }
}
