<?php

use App\Http\Controllers\Api\V1\Auth\ExtensionTokenExchangeController;
use App\Http\Controllers\Api\V1\Auth\ExtensionSessionController;
use App\Http\Controllers\Api\V1\Billing\BillingPortalController;
use App\Http\Controllers\Api\V1\Billing\BillingWebhookController;
use App\Http\Controllers\Api\V1\Integrations\GitHubWebhookController;
use App\Http\Controllers\Api\V1\Integrations\JiraWebhookController;
use App\Http\Controllers\Api\V1\Integrations\OrganizationIntegrationController;
use App\Http\Controllers\Api\V1\Keys\CaptureKeyController;
use App\Http\Controllers\Api\V1\Issues\IssueController;
use App\Http\Controllers\Api\V1\Issues\IssueExternalLinkController;
use App\Http\Controllers\Api\V1\Issues\IssueReportController;
use App\Http\Controllers\Api\V1\Issues\IssueShareController;
use App\Http\Controllers\Api\V1\PublicCapture\PublicCaptureController;
use App\Http\Controllers\Api\V1\PublicWebsiteWidgetBootstrapController;
use App\Http\Controllers\Api\V1\Reports\FinalizeReportController;
use App\Http\Controllers\Api\V1\Reports\ReportActionController;
use App\Http\Controllers\Api\V1\Reports\ReportIssueController;
use App\Http\Controllers\Api\V1\Reports\UploadSessionController;
use App\Http\Controllers\Api\V1\WebsiteWidgetController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/extension/tokens/exchange', [ExtensionTokenExchangeController::class, 'store'])
        ->middleware('extension.exchange.throttle')
        ->name('api.v1.extension.exchange');
    Route::delete('/extension/session', [ExtensionSessionController::class, 'destroy'])
        ->middleware('auth:sanctum')
        ->name('api.v1.extension.session.destroy');
    Route::post('/webhooks/stripe', BillingWebhookController::class)->name('api.v1.webhooks.stripe');
    Route::post('/webhooks/github/{integration}', GitHubWebhookController::class)->name('api.v1.webhooks.github');
    Route::post('/webhooks/jira/{integration}', JiraWebhookController::class)->name('api.v1.webhooks.jira');

    Route::post('/public/capture/tokens', [PublicCaptureController::class, 'issueToken'])
        ->middleware('public.capture.throttle')
        ->name('api.v1.public.capture.token');
    Route::get('/public/widgets/{publicId}/bootstrap', PublicWebsiteWidgetBootstrapController::class)
        ->name('api.v1.public.widgets.bootstrap');
    Route::middleware(['public.capture.throttle', 'capture.token'])->group(function () {
        Route::post('/public/capture/upload-sessions', [PublicCaptureController::class, 'store'])->name('api.v1.public.capture.create');
        Route::post('/public/capture/finalize', [PublicCaptureController::class, 'finalize'])->name('api.v1.public.capture.finalize');
    });

    Route::middleware(['auth:sanctum', 'active.organization'])->group(function () {
        Route::get('/user', fn (Request $request) => $request->user())
            ->middleware('token.abilities:reports:create');
        Route::post('/reports/upload-sessions', [UploadSessionController::class, 'store'])
            ->middleware('token.abilities:reports:create')
            ->name('api.v1.reports.upload-session');
        Route::post('/reports/finalize', [FinalizeReportController::class, 'store'])
            ->middleware('token.abilities:reports:create')
            ->name('api.v1.reports.finalize');
        Route::post('/reports/{bugReport}/retry-ingestion', [ReportActionController::class, 'retry'])
            ->middleware('token.abilities:reports:manage')
            ->name('api.v1.reports.retry');
        Route::patch('/reports/{bugReport}/triage', [ReportActionController::class, 'updateTriage'])
            ->middleware('token.abilities:reports:manage')
            ->name('api.v1.reports.triage');
        Route::post('/reports/{bugReport}/issue', [ReportIssueController::class, 'store'])
            ->middleware('token.abilities:issues:write')
            ->name('api.v1.reports.issue');
        Route::delete('/reports/{bugReport}', [ReportActionController::class, 'destroy'])
            ->middleware('token.abilities:reports:manage')
            ->name('api.v1.reports.destroy');
        Route::post('/issues', [IssueController::class, 'store'])
            ->middleware('token.abilities:issues:write')
            ->name('api.v1.issues.store');
        Route::patch('/issues/{bugIssue}', [IssueController::class, 'update'])
            ->middleware('token.abilities:issues:write')
            ->name('api.v1.issues.update');
        Route::delete('/issues/{bugIssue}', [IssueController::class, 'destroy'])
            ->middleware('token.abilities:issues:write')
            ->name('api.v1.issues.destroy');
        Route::post('/issues/{bugIssue}/reports', [IssueReportController::class, 'store'])
            ->middleware('token.abilities:issues:write')
            ->name('api.v1.issues.reports.store');
        Route::delete('/issues/{bugIssue}/reports/{bugReport}', [IssueReportController::class, 'destroy'])
            ->middleware('token.abilities:issues:write')
            ->name('api.v1.issues.reports.destroy');
        Route::post('/issues/{bugIssue}/share-links', [IssueShareController::class, 'store'])
            ->middleware('token.abilities:issues:share')
            ->name('api.v1.issues.share-links.store');
        Route::delete('/issues/{bugIssue}/share-links/{shareToken}', [IssueShareController::class, 'destroy'])
            ->middleware('token.abilities:issues:share')
            ->name('api.v1.issues.share-links.destroy');
        Route::post('/issues/{bugIssue}/external-links', [IssueExternalLinkController::class, 'store'])
            ->middleware('token.abilities:integrations:manage')
            ->name('api.v1.issues.external-links.store');
        Route::post('/issues/{bugIssue}/external-links/{externalLink}/sync', [IssueExternalLinkController::class, 'sync'])
            ->middleware('token.abilities:integrations:manage')
            ->name('api.v1.issues.external-links.sync');
        Route::delete('/issues/{bugIssue}/external-links/{externalLink}', [IssueExternalLinkController::class, 'destroy'])
            ->middleware('token.abilities:integrations:manage')
            ->name('api.v1.issues.external-links.destroy');
        Route::post('/integrations', [OrganizationIntegrationController::class, 'store'])
            ->middleware('token.abilities:integrations:manage')
            ->name('api.v1.integrations.store');
        Route::apiResource('/capture-keys', CaptureKeyController::class)
            ->middleware('token.abilities:capture-keys:manage')
            ->except(['create', 'edit', 'show']);
        Route::apiResource('/website-widgets', WebsiteWidgetController::class)
            ->middleware('token.abilities:capture-keys:manage')
            ->except(['create', 'edit', 'show']);
        Route::middleware('billing.enabled')->group(function () {
            Route::post('/billing/checkout', [BillingPortalController::class, 'checkout'])
                ->middleware('token.abilities:billing:manage')
                ->name('api.v1.billing.checkout');
            Route::post('/billing/portal', [BillingPortalController::class, 'portal'])
                ->middleware('token.abilities:billing:manage')
                ->name('api.v1.billing.portal');
        });
    });
});
