<?php

namespace Tests\Feature\Widgets;

use App\Models\CaptureKey;
use App\Models\WebsiteWidget;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class WebsiteWidgetApiTest extends TestCase
{
    use CreatesOrganizations;
    use RefreshDatabase;

    public function test_owner_can_create_a_website_widget_and_linked_capture_key(): void
    {
        $owner = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $organization = $this->createOrganizationFor($owner);

        $response = $this->actingAs($owner)->postJson(route('website-widgets.store'), [
            'name' => 'Marketing site widget',
            'allowed_origins' => ['https://app.example.com', 'https://www.example.com'],
            'config' => [
                'launcher' => ['label' => 'Report a checkout problem'],
                'theme' => ['accent_color' => '#1d4ed8', 'icon_style' => 'bug'],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Marketing site widget')
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.allowed_origins.0', 'https://app.example.com')
            ->assertJsonPath('data.config.launcher.label', 'Report a checkout problem')
            ->assertJsonPath('data.config.theme.accent_color', '#1d4ed8')
            ->assertJsonPath('data.config.theme.icon_style', 'bug')
            ->assertJsonPath('data.public_id', fn (?string $value) => is_string($value) && str_starts_with($value, 'ww_'))
            ->assertJsonPath('data.capture_key_public_key', fn (?string $value) => is_string($value) && str_starts_with($value, 'ck_'));

        $widget = WebsiteWidget::query()->with('captureKey')->firstOrFail();

        $this->assertSame($organization->id, $widget->organization_id);
        $this->assertSame(['https://app.example.com', 'https://www.example.com'], $widget->allowed_origins);
        $this->assertSame('Report a checkout problem', data_get($widget->config, 'launcher.label'));
        $this->assertSame($widget->allowed_origins, $widget->captureKey?->allowed_origins);
        $this->assertSame('active', $widget->captureKey?->status->value);
    }

    public function test_owner_can_update_widget_origins_status_and_config_in_one_request(): void
    {
        $owner = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $organization = $this->createOrganizationFor($owner);
        $captureKey = CaptureKey::query()->create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'name' => 'Legacy widget key',
            'public_key' => 'ck_widget_legacy_key',
            'relay_secret' => 'relay-secret-website-widget-legacy',
            'status' => 'active',
            'allowed_origins' => ['https://old.example.com'],
        ]);
        $widget = WebsiteWidget::query()->create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'capture_key_id' => $captureKey->id,
            'public_id' => 'ww_legacywidget',
            'name' => 'Legacy widget',
            'status' => 'active',
            'allowed_origins' => ['https://old.example.com'],
            'config' => [
                'launcher' => ['label' => 'Report a bug'],
                'intro' => ['title' => 'Found something broken?'],
                'theme' => ['accent_color' => '#d97706', 'mode' => 'auto', 'offset_x' => 20, 'offset_y' => 20, 'icon_style' => 'camera'],
            ],
        ]);

        $this->actingAs($owner)->patchJson(route('website-widgets.update', $widget), [
            'name' => 'Checkout widget',
            'status' => 'disabled',
            'allowed_origins' => ['https://shop.example.com'],
            'config' => [
                'launcher' => ['label' => 'Report checkout issue'],
                'theme' => ['accent_color' => '#0f766e', 'mode' => 'dark', 'offset_x' => 28, 'offset_y' => 32, 'icon_style' => 'feedback'],
            ],
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Checkout widget')
            ->assertJsonPath('data.status', 'disabled')
            ->assertJsonPath('data.allowed_origins.0', 'https://shop.example.com')
            ->assertJsonPath('data.config.launcher.label', 'Report checkout issue')
            ->assertJsonPath('data.config.theme.mode', 'dark')
            ->assertJsonPath('data.config.theme.icon_style', 'feedback');

        $widget->refresh();
        $captureKey->refresh();

        $this->assertSame('Checkout widget', $widget->name);
        $this->assertSame(['https://shop.example.com'], $widget->allowed_origins);
        $this->assertSame('disabled', $widget->status->value);
        $this->assertSame('Report checkout issue', data_get($widget->config, 'launcher.label'));
        $this->assertSame('disabled', $widget->status->value);
        $this->assertSame('revoked', $captureKey->status->value);
        $this->assertSame(['https://shop.example.com'], $captureKey->allowed_origins);
        $this->assertNotNull($captureKey->revoked_at);
    }

    public function test_owner_can_delete_widget_without_deleting_historical_capture_key_record(): void
    {
        $owner = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $organization = $this->createOrganizationFor($owner);
        $captureKey = CaptureKey::query()->create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'name' => 'Widget key',
            'public_key' => 'ck_widget_delete_test',
            'relay_secret' => 'relay-secret-widget-delete',
            'status' => 'active',
            'allowed_origins' => ['https://widget.example.com'],
        ]);
        $widget = WebsiteWidget::query()->create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'capture_key_id' => $captureKey->id,
            'public_id' => 'ww_deletewidget',
            'name' => 'Delete me',
            'status' => 'active',
            'allowed_origins' => ['https://widget.example.com'],
            'config' => [],
        ]);

        $this->actingAs($owner)
            ->deleteJson(route('website-widgets.destroy', $widget))
            ->assertOk()
            ->assertJsonPath('deleted', true);

        $this->assertDatabaseMissing('website_widgets', ['id' => $widget->id]);
        $this->assertDatabaseHas('capture_keys', [
            'id' => $captureKey->id,
            'status' => 'revoked',
        ]);
    }

    public function test_member_cannot_manage_website_widgets(): void
    {
        $owner = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $organization = $this->createOrganizationFor($owner);
        $member = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $this->addMembership($organization, $member);
        $member->forceFill([
            'active_organization_id' => $organization->id,
        ])->save();

        $this->actingAs($member)->getJson(route('website-widgets.index'))->assertForbidden();
        $this->actingAs($member)->postJson(route('website-widgets.store'), [
            'name' => 'Widget',
            'allowed_origins' => ['https://widget.example.com'],
        ])->assertForbidden();
    }
}
