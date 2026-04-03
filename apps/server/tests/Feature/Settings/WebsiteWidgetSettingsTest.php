<?php

namespace Tests\Feature\Settings;

use App\Enums\CaptureKeyStatus;
use App\Enums\WebsiteWidgetStatus;
use App\Models\CaptureKey;
use App\Models\User;
use App\Models\WebsiteWidget;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class WebsiteWidgetSettingsTest extends TestCase
{
    use CreatesOrganizations;
    use RefreshDatabase;

    public function test_capture_settings_show_website_widgets_separately_from_manual_capture_keys(): void
    {
        $owner = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $organization = $this->createOrganizationFor($owner, name: 'Acme QA');

        $widgetCaptureKey = CaptureKey::query()->create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'name' => 'Checkout widget',
            'public_key' => 'ck_widget_checkout',
            'relay_secret' => 'relay-secret-widget-checkout',
            'status' => CaptureKeyStatus::Active->value,
            'allowed_origins' => ['https://checkout.example.com'],
        ]);

        WebsiteWidget::query()->create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'capture_key_id' => $widgetCaptureKey->id,
            'public_id' => 'ww_checkoutdemo',
            'name' => 'Checkout widget',
            'status' => WebsiteWidgetStatus::Active->value,
            'allowed_origins' => ['https://checkout.example.com'],
            'config' => [
                'launcher' => [
                    'label' => 'Report checkout issue',
                ],
            ],
        ]);

        CaptureKey::query()->create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'name' => 'Manual relay key',
            'public_key' => 'ck_manual_relay',
            'relay_secret' => 'relay-secret-manual-key',
            'status' => CaptureKeyStatus::Active->value,
            'allowed_origins' => ['https://relay.example.com'],
        ]);

        $this->actingAs($owner)
            ->get(route('settings.capture-keys'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Settings/Index')
                ->where('section', 'capture-keys')
                ->where('websiteWidgets.0.public_id', 'ww_checkoutdemo')
                ->where('websiteWidgets.0.name', 'Checkout widget')
                ->where('websiteWidgets.0.capture_key_public_key', 'ck_widget_checkout')
                ->where('websiteWidgets.0.config.launcher.label', 'Report checkout issue')
                ->has('captureKeys', 1)
                ->where('captureKeys.0.name', 'Manual relay key')
                ->where('captureKeys.0.public_key', 'ck_manual_relay')
                ->where('widgetEmbedScriptUrl', route('embed.widget.script'))
                ->where('widgetEmbedBaseUrl', url('/'))
                ->where('websiteWidgetDefaults.launcher.label', 'Report a bug'));
    }
}
