<?php

namespace Tests\Feature\Documentation;

use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Tests\TestCase;

class DocumentationRouteTest extends TestCase
{
    public function test_docs_index_route_serves_the_vitepress_home_page(): void
    {
        $response = $this->get(route('docs.index'));

        $response
            ->assertOk()
            ->assertHeader('Content-Type', 'text/html; charset=UTF-8');

        $this->assertInstanceOf(BinaryFileResponse::class, $response->baseResponse);
        $this->assertSame('index.html', $response->baseResponse->getFile()->getFilename());
    }

    public function test_docs_asset_route_serves_static_assets_from_the_docs_build(): void
    {
        $this->get(route('docs.show', ['path' => 'vp-icons.css']))
            ->assertOk()
            ->assertHeader('Content-Type', 'text/css; charset=UTF-8');
    }

    public function test_docs_routes_reject_missing_files_with_a_not_found_status(): void
    {
        $this->get(route('docs.show', ['path' => 'missing-page']))
            ->assertNotFound();
    }
}
