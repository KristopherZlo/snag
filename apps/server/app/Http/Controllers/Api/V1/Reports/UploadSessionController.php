<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Reports\CreateUploadSessionRequest;
use App\Models\BugReport;
use App\Models\Organization;
use App\Services\Reports\ReportWorkflowService;

class UploadSessionController extends Controller
{
    public function store(CreateUploadSessionRequest $request, ReportWorkflowService $workflow)
    {
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');

        $this->authorize('create', BugReport::class);

        return response()->json(
            $workflow->createAuthenticatedSession($request->user(), $organization, $request->validated())
        );
    }
}
