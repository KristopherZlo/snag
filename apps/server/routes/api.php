<?php

use App\Http\Controllers\Api\V1\Auth\ExtensionTokenExchangeController;
use App\Http\Controllers\Api\V1\Billing\BillingPortalController;
use App\Http\Controllers\Api\V1\Billing\BillingWebhookController;
use App\Http\Controllers\Api\V1\Keys\CaptureKeyController;
use App\Http\Controllers\Api\V1\PublicCapture\PublicCaptureController;
use App\Http\Controllers\Api\V1\Reports\FinalizeReportController;
use App\Http\Controllers\Api\V1\Reports\ReportActionController;
use App\Http\Controllers\Api\V1\Reports\UploadSessionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/extension/tokens/exchange', [ExtensionTokenExchangeController::class, 'store'])->name('api.v1.extension.exchange');
    Route::post('/webhooks/stripe', BillingWebhookController::class)->name('api.v1.webhooks.stripe');

    Route::post('/public/capture/tokens', [PublicCaptureController::class, 'issueToken'])->name('api.v1.public.capture.token');
    Route::middleware('capture.token')->group(function () {
        Route::post('/public/capture/upload-sessions', [PublicCaptureController::class, 'store'])->name('api.v1.public.capture.create');
        Route::post('/public/capture/finalize', [PublicCaptureController::class, 'finalize'])->name('api.v1.public.capture.finalize');
    });

    Route::middleware(['auth:sanctum', 'active.organization'])->group(function () {
        Route::get('/user', fn (Request $request) => $request->user());
        Route::post('/reports/upload-sessions', [UploadSessionController::class, 'store'])->name('api.v1.reports.upload-session');
        Route::post('/reports/finalize', [FinalizeReportController::class, 'store'])->name('api.v1.reports.finalize');
        Route::post('/reports/{bugReport}/retry-ingestion', [ReportActionController::class, 'retry'])->name('api.v1.reports.retry');
        Route::delete('/reports/{bugReport}', [ReportActionController::class, 'destroy'])->name('api.v1.reports.destroy');
        Route::apiResource('/capture-keys', CaptureKeyController::class)->except(['create', 'edit', 'show']);
        Route::middleware('billing.enabled')->group(function () {
            Route::post('/billing/checkout', [BillingPortalController::class, 'checkout'])->name('api.v1.billing.checkout');
            Route::post('/billing/portal', [BillingPortalController::class, 'portal'])->name('api.v1.billing.portal');
        });
    });
});
