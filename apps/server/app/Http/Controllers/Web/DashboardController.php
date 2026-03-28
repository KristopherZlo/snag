<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\BugReport;
use App\Models\Organization;
use App\Services\Billing\EntitlementService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, EntitlementService $entitlements): Response
    {
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');
        $search = $request->string('search')->toString();
        $status = $request->string('status')->toString();

        $reports = BugReport::query()
            ->with('artifacts')
            ->where('organization_id', $organization->id)
            ->when($search !== '', fn ($query) => $query
                ->where('title', 'like', "%{$search}%")
                ->orWhere('summary', 'like', "%{$search}%"))
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->latest()
            ->paginate(12)
            ->through(fn (BugReport $report) => [
                'id' => $report->id,
                'title' => $report->title,
                'summary' => $report->summary,
                'status' => $report->status->value,
                'visibility' => $report->visibility->value,
                'media_kind' => $report->media_kind,
                'created_at' => $report->created_at?->toIso8601String(),
                'share_url' => $report->publicShareUrl(),
            ])
            ->withQueryString();

        return Inertia::render('Dashboard', [
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
            'reports' => $reports,
            'membersCount' => $organization->memberships()->count(),
            'entitlements' => $entitlements->snapshot($organization),
        ]);
    }
}
