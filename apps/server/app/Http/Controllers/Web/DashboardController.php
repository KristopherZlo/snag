<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\BugIssue;
use App\Models\BugReport;
use App\Models\Organization;
use App\Services\BugIssues\BugIssuePresenter;
use App\Services\Reports\ReportArtifactMediaPayloadFactory;
use App\Services\Billing\EntitlementService;
use App\Services\Reports\ReportArtifactPreviewSelector;
use App\Services\Reports\VideoPreviewGenerator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(
        Request $request,
        EntitlementService $entitlements,
        BugIssuePresenter $issues,
        ReportArtifactPreviewSelector $previews,
        ReportArtifactMediaPayloadFactory $mediaPayloads,
        VideoPreviewGenerator $videoPreviews,
    ): Response
    {
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');
        $search = $request->string('search')->toString();
        $status = $request->string('status')->toString();
        $sort = $this->normalizeSort($request->string('sort')->toString());
        $view = $this->normalizeView($request->string('view')->toString());

        $reportsQuery = BugReport::query()
            ->with(['artifacts', 'issues.externalLinks'])
            ->where('organization_id', $organization->id)
            ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $searchQuery) use ($search) {
                $searchQuery
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('summary', 'like', "%{$search}%");
            }))
            ->when($status !== '', fn (Builder $query) => $query->where('status', $status));

        $this->applySort($reportsQuery, $sort);

        $reports = $reportsQuery
            ->paginate(12)
            ->through(function (BugReport $report) use ($issues, $previews, $mediaPayloads, $videoPreviews) {
                if ($report->media_kind === 'video' && ! $previews->generatedPreviewFor($report)) {
                    $videoPreviews->generateForReport($report);
                    $report->load('artifacts');
                }

                return [
                    'id' => $report->id,
                    'title' => $report->title,
                    'summary' => $report->summary,
                    'status' => $report->status->value,
                    'workflow_state' => $report->workflow_state->value,
                    'urgency' => $report->urgency->value,
                    'tag' => $report->triage_tag->value,
                    'visibility' => $report->visibility->value,
                    'media_kind' => $report->media_kind,
                    'created_at' => $report->created_at?->toIso8601String(),
                    'share_url' => null,
                    'has_public_share' => $report->hasPublicShare(),
                    'linked_issue' => ($linkedIssue = $report->issues->first()) ? $issues->listItem($linkedIssue) : null,
                    'preview' => $mediaPayloads->preview($report, includeDashboardUrl: true),
                ];
            })
            ->withQueryString();

        return Inertia::render('Dashboard', [
            'filters' => [
                'search' => $search,
                'status' => $status,
                'sort' => $sort,
                'view' => $view,
            ],
            'reports' => $reports,
            'openIssues' => BugIssue::query()
                ->with(['reports.artifacts', 'reports.reporter', 'externalLinks', 'shareTokens', 'assignee', 'creator'])
                ->where('organization_id', $organization->id)
                ->where('workflow_state', '!=', 'done')
                ->latest()
                ->take(12)
                ->get()
                ->map(fn (BugIssue $issue) => $issues->listItem($issue))
                ->values(),
            'membersCount' => $organization->memberships()->count(),
            'entitlements' => $entitlements->snapshot($organization),
        ]);
    }

    private function applySort(Builder $query, string $sort): void
    {
        match ($sort) {
            'oldest' => $query->oldest(),
            'title_asc' => $query->orderBy('title')->orderByDesc('created_at'),
            'title_desc' => $query->orderByDesc('title')->orderByDesc('created_at'),
            'urgency_desc' => $query
                ->orderByRaw($this->urgencyOrderSql().' desc')
                ->orderByDesc('created_at'),
            'urgency_asc' => $query
                ->orderByRaw($this->urgencyOrderSql().' asc')
                ->orderByDesc('created_at'),
            default => $query->latest(),
        };
    }

    private function normalizeSort(string $sort): string
    {
        return in_array($sort, ['newest', 'oldest', 'title_asc', 'title_desc', 'urgency_desc', 'urgency_asc'], true)
            ? $sort
            : 'newest';
    }

    private function normalizeView(string $view): string
    {
        return in_array($view, ['cards', 'compact'], true)
            ? $view
            : 'cards';
    }

    private function urgencyOrderSql(): string
    {
        return <<<'SQL'
            case urgency
                when 'critical' then 4
                when 'high' then 3
                when 'medium' then 2
                when 'low' then 1
                else 0
            end
        SQL;
    }
}
