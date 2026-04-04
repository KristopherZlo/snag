<?php

namespace Tests\Feature\Widgets;

use Tests\TestCase;

class WebsiteWidgetScriptControllerTest extends TestCase
{
    public function test_embed_widget_script_is_served_as_a_non_cacheable_loader(): void
    {
        $response = $this->get('/embed/widget.js');
        $cacheControl = $response->headers->get('Cache-Control', '');

        $response
            ->assertOk()
            ->assertHeader('Content-Type', 'application/javascript; charset=UTF-8')
            ->assertSee('loader.type = \'module\';', false);

        $this->assertStringContainsString('build\\/assets\\/widget-', $response->getContent());

        $this->assertStringContainsString('no-store', $cacheControl);
        $this->assertStringContainsString('no-cache', $cacheControl);
    }
}
