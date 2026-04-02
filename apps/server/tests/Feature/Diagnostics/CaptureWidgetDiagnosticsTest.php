<?php

namespace Tests\Feature\Diagnostics;

use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CaptureWidgetDiagnosticsTest extends TestCase
{
    public function test_public_capture_widget_diagnostics_page_is_available_in_testing(): void
    {
        $this->get(route('diagnostics.capture-widget'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Diagnostics/CaptureWidget')
                ->where('docsUrl', route('docs.show', ['path' => 'capture']))
                ->where('prefillPublicKey', 'ck_eq00kwumu0we64dqvslndnxswqppgmzc')
                ->where('apiBaseUrl', url('/'))
            );
    }
}
