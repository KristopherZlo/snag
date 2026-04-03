<?php

namespace App\Http\Controllers\Api\V1\Integrations;

use App\Enums\BugIssueExternalProvider;
use App\Http\Controllers\Controller;
use App\Models\OrganizationIntegration;
use App\Services\BugIssues\IssueExternalLinkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JiraWebhookController extends Controller
{
    public function __construct(
        private readonly IssueExternalLinkService $links,
    ) {
    }

    public function __invoke(Request $request, OrganizationIntegration $integration): JsonResponse
    {
        abort_unless($integration->provider === BugIssueExternalProvider::Jira, 404);
        abort_unless($integration->is_enabled, 404);

        $expected = 'sha256='.hash_hmac('sha256', $request->getContent(), (string) $integration->webhook_secret);
        abort_unless(hash_equals($expected, (string) $request->header('X-Snag-Signature-256')), 401);

        $link = $this->links->applyWebhook($integration, $request->all());

        return response()->json([
            'ok' => true,
            'issue_id' => $link?->bug_issue_id,
        ]);
    }
}
