<?php

namespace Tests\Feature\Diagnostics;

use App\Models\CaptureKey;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CaptureWidgetDiagnosticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_capture_widget_diagnostics_page_is_available_in_testing(): void
    {
        $this->get(route('diagnostics.capture-widget'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Diagnostics/CaptureWidget')
                ->where('docsUrl', route('docs.show', ['path' => 'capture']))
                ->where('prefillPublicKey', 'ck_wnz6f0axnoqbsz0f0bonhvm3haelxyxl')
                ->where('apiBaseUrl', url('/'))
            );
    }

    public function test_diagnostics_capture_widget_adds_current_origin_to_demo_capture_key(): void
    {
        $owner = User::factory()->create();
        $organization = Organization::query()->create([
            'name' => 'Diagnostics demo',
            'slug' => 'diagnostics-demo',
            'owner_id' => $owner->id,
            'billing_email' => $owner->email,
        ]);

        $captureKey = CaptureKey::query()->create([
            'organization_id' => $organization->id,
            'created_by_user_id' => $owner->id,
            'name' => 'Diagnostics widget',
            'public_key' => 'ck_wnz6f0axnoqbsz0f0bonhvm3haelxyxl',
            'status' => 'active',
            'allowed_origins' => ['https://widget.example.com'],
        ]);

        $this->get(route('diagnostics.capture-widget'))
            ->assertOk();

        $this->assertSame(
            ['https://widget.example.com', 'http://localhost'],
            $captureKey->fresh()->allowed_origins,
        );
    }
}
