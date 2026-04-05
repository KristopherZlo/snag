<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\ReportArtifact;
use App\Services\Reports\DashboardArtifactPreviewRenderer;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DashboardArtifactPreviewController extends Controller
{
    public function __invoke(
        Request $request,
        ReportArtifact $reportArtifact,
        DashboardArtifactPreviewRenderer $renderer,
    ): Response|BinaryFileResponse {
        $reportArtifact->loadMissing('bugReport');
        $this->authorize('view', $reportArtifact->bugReport);

        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');

        abort_if($reportArtifact->organization_id !== $organization->id, 404);

        return $renderer->render($reportArtifact, $request->integer('w'));
    }
}
