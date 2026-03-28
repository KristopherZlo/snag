<?php

namespace Tests\Feature\Diagnostics;

use Tests\TestCase;

class ExtensionRecorderDiagnosticsTest extends TestCase
{
    public function test_extension_recorder_diagnostics_page_is_available_in_testing(): void
    {
        $this->get(route('diagnostics.extension-recorder'))
            ->assertOk()
            ->assertSee('Extension recorder diagnostics')
            ->assertSee('Emit console error');
    }

    public function test_extension_recorder_ping_route_returns_json(): void
    {
        $this->getJson(route('diagnostics.extension-recorder.ping', ['kind' => 'fetch']))
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('kind', 'fetch');
    }
}
