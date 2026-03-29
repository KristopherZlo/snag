<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\BugIssue;
use App\Models\Organization;
use App\Services\BugIssues\BugIssuePresenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BugBoardController extends Controller
{
    public function __construct(
        private readonly BugIssuePresenter $presenter,
    ) {
    }

    public function __invoke(Request $request): Response
    {
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');
        $search = $request->string('search')->toString();
        $view = $this->normalizeView($request->string('view')->toString());
        $workflow = $request->string('workflow_state')->toString();
        $resolution = $request->string('resolution')->toString();
        $assignee = $request->string('assignee')->toString();

        $issues = BugIssue::query()
            ->with(['reports.artifacts', 'reports.reporter', 'externalLinks', 'shareTokens', 'assignee', 'creator'])
            ->where('organization_id', $organization->id)
            ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $searchQuery) use ($search) {
                $searchQuery
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('summary', 'like', "%{$search}%")
                    ->orWhereHas('reports', fn (Builder $reportQuery) => $reportQuery
                        ->where('title', 'like', "%{$search}%")
                        ->orWhere('summary', 'like', "%{$search}%"));
            }))
            ->when($workflow !== '', fn (Builder $query) => $query->where('workflow_state', $workflow))
            ->when($resolution !== '', fn (Builder $query) => $query->where('resolution', $resolution))
            ->when($assignee === 'me', fn (Builder $query) => $query->where('assignee_id', $request->user()->id))
            ->when($assignee !== '' && $assignee !== 'me', fn (Builder $query) => $query->where('assignee_id', $assignee))
            ->when($view === 'my_work', fn (Builder $query) => $query->where('assignee_id', $request->user()->id))
            ->when($view === 'verification', fn (Builder $query) => $query->where('workflow_state', 'ready_to_verify'))
            ->orderByRaw($this->urgencyOrderSql('bug_issues.urgency').' desc')
            ->orderByDesc('last_seen_at')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (BugIssue $issue) => $this->presenter->listItem($issue))
            ->values();

        return Inertia::render('Bugs/Index', [
            'filters' => [
                'search' => $search,
                'view' => $view,
                'workflow_state' => $workflow,
                'resolution' => $resolution,
                'assignee' => $assignee,
            ],
            'issues' => $issues,
            'summary' => [
                'total' => $issues->count(),
                'inbox' => $issues->where('workflow_state', 'inbox')->count(),
                'triaged' => $issues->where('workflow_state', 'triaged')->count(),
                'in_progress' => $issues->where('workflow_state', 'in_progress')->count(),
                'ready_to_verify' => $issues->where('workflow_state', 'ready_to_verify')->count(),
                'done' => $issues->where('workflow_state', 'done')->count(),
                'critical' => $issues->where('urgency', 'critical')->count(),
                'linked' => $issues->where('primary_external_link')->count(),
                'shared' => $issues->whereNotNull('guest_share_url')->count(),
            ],
            'members' => $organization->memberships()->with('user')->get()->map(fn ($membership) => [
                'id' => $membership->user_id,
                'name' => $membership->user?->name,
                'email' => $membership->user?->email,
            ])->values(),
        ]);
    }

    private function normalizeView(string $view): string
    {
        return in_array($view, ['board', 'list', 'my_work', 'verification'], true)
            ? $view
            : 'board';
    }

    private function urgencyOrderSql(string $column): string
    {
        return sprintf(<<<'SQL'
            case %s
                when 'critical' then 4
                when 'high' then 3
                when 'medium' then 2
                when 'low' then 1
                else 0
            end
        SQL, $column);
    }
}
