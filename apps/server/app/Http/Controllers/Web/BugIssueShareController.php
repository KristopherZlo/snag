<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\BugIssueShareToken;
use App\Services\BugIssues\BugIssuePresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BugIssueShareController extends Controller
{
    public function __construct(
        private readonly BugIssuePresenter $presenter,
    ) {
    }

    public function show(Request $request, string $shareToken): Response
    {
        $token = BugIssueShareToken::query()
            ->with([
                'issue.reports.artifacts',
                'issue.reports.reporter',
                'issue.externalLinks',
            ])
            ->where('token', $shareToken)
            ->whereNull('revoked_at')
            ->where(function ($query) {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->firstOrFail();

        $token->forceFill(['last_accessed_at' => now()])->save();

        return Inertia::render('Bugs/Share', [
            'issue' => $this->presenter->sharePayload($token->issue, $token),
        ]);
    }
}
