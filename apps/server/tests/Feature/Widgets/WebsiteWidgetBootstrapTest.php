<?php

namespace Tests\Feature\Widgets;

use App\Models\CaptureKey;
use App\Models\User;
use App\Models\WebsiteWidget;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class WebsiteWidgetBootstrapTest extends TestCase
{
    use CreatesOrganizations;
    use RefreshDatabase;

    public function test_public_bootstrap_returns_only_safe_widget_runtime_config(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganizationFor($owner);
        $captureKey = CaptureKey::query()->create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'name' => 'Widget key',
            'public_key' => 'ck_widget_bootstrap_key',
            'relay_secret' => 'relay-secret-bootstrap-widget',
            'status' => 'active',
            'allowed_origins' => ['https://widget.example.com'],
        ]);
        $widget = WebsiteWidget::query()->create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'capture_key_id' => $captureKey->id,
            'public_id' => 'ww_bootstrapdemo',
            'name' => 'Checkout widget',
            'status' => 'active',
            'allowed_origins' => ['https://widget.example.com'],
            'config' => [
                'launcher' => ['label' => 'Report checkout issue'],
                'review' => ['send_label' => 'Send to support'],
            ],
        ]);

        $this->getJson(route('api.v1.public.widgets.bootstrap', $widget->public_id))
            ->assertOk()
            ->assertJsonPath('widget.public_id', 'ww_bootstrapdemo')
            ->assertJsonPath('widget.name', 'Checkout widget')
            ->assertJsonPath('capture.public_key', 'ck_widget_bootstrap_key')
            ->assertJsonPath('capture.media_kind', 'screenshot')
            ->assertJsonPath('runtime.position', 'bottom-right')
            ->assertJsonPath('runtime.screenshot_only', true)
            ->assertJsonPath('config.launcher.label', 'Report checkout issue')
            ->assertJsonPath('config.review.send_label', 'Send to support')
            ->assertJsonMissingPath('widget.id')
            ->assertJsonMissingPath('widget.organization_id')
            ->assertJsonMissingPath('capture.relay_secret')
            ->assertJsonMissingPath('capture.allowed_origins');
    }

    public function test_disabled_widget_cannot_be_bootstrapped(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganizationFor($owner);
        $captureKey = CaptureKey::query()->create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'name' => 'Widget key',
            'public_key' => 'ck_widget_bootstrap_disabled',
            'relay_secret' => 'relay-secret-bootstrap-disabled',
            'status' => 'revoked',
            'allowed_origins' => ['https://widget.example.com'],
            'revoked_at' => now(),
        ]);
        WebsiteWidget::query()->create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'capture_key_id' => $captureKey->id,
            'public_id' => 'ww_bootstrapdisabled',
            'name' => 'Disabled widget',
            'status' => 'disabled',
            'allowed_origins' => ['https://widget.example.com'],
            'config' => [],
        ]);

        $this->getJson(route('api.v1.public.widgets.bootstrap', 'ww_bootstrapdisabled'))
            ->assertNotFound();
    }
}
