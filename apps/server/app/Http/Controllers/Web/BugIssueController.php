<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\BugIssue;
use App\Models\BugReport;
use App\Models\Organization;
use App\Services\BugIssues\BugIssueHandoffService;
use App\Services\BugIssues\BugIssuePresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BugIssueController extends Controller
{
    public function __construct(
        private readonly BugIssuePresenter $presenter,
        private readonly BugIssueHandoffService $handoff,
    ) {
    }

    public function show(Request $request, BugIssue $bugIssue): Response
    {
        $this->authorize('view', $bugIssue);
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');

        $bugIssue->load([
            'reports.artifacts',
            'reports.reporter',
            'reports.debuggerActions',
            'reports.debuggerLogs',
            'reports.debuggerNetworkRequests',
            'externalLinks',
            'shareTokens',
            'activities.user',
            'assignee',
            'creator',
        ]);

        $availableReports = BugReport::query()
            ->with('artifacts')
            ->where('organization_id', $organization->id)
            ->whereDoesntHave('issues')
            ->latest()
            ->take(20)
            ->get()
            ->map(fn (BugReport $report) => $this->presenter->reportItem($report))
            ->values();

        return Inertia::render('Bugs/Show', [
            'issue' => $this->presenter->detail($bugIssue),
            'availableReports' => $availableReports,
            'members' => $organization->memberships()->with('user')->get()->map(fn ($membership) => [
                'id' => $membership->user_id,
                'name' => $membership->user?->name,
                'email' => $membership->user?->email,
            ])->values(),
        ]);
    }

    public function handoff(Request $request, BugIssue $bugIssue)
    {
        $this->authorize('view', $bugIssue);

        $bugIssue->load(['reports.reporter', 'shareTokens', 'externalLinks', 'assignee']);

        $format = $request->string('format')->toString();

        return match ($format) {
            'markdown' => response($this->handoff->asMarkdown($bugIssue), 200, ['Content-Type' => 'text/markdown; charset=UTF-8']),
            'text' => response($this->handoff->asText($bugIssue), 200, ['Content-Type' => 'text/plain; charset=UTF-8']),
            default => response()->json($this->handoff->asArray($bugIssue)),
        };
    }
}
