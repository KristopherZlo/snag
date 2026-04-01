<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Web\BugBoardController;
use App\Http\Controllers\Web\BugIssueController;
use App\Http\Controllers\Web\BugIssueShareController;
use App\Http\Controllers\Web\DashboardController;
use App\Http\Controllers\Web\DocumentationController;
use App\Http\Controllers\Web\ExtensionCaptureController;
use App\Http\Controllers\Web\ExtensionConnectController;
use App\Http\Controllers\Web\InvitationController;
use App\Http\Controllers\Web\OrganizationController;
use App\Http\Controllers\Web\ReportController;
use App\Http\Controllers\Web\SettingsController;
use App\Http\Controllers\Web\ShareController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return auth()->check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
})->name('home');

Route::get('/docs', DocumentationController::class)->name('docs.index');
Route::get('/docs/{path}', DocumentationController::class)
    ->where('path', '.*')
    ->name('docs.show');

if (app()->environment(['local', 'testing', 'e2e'])) {
    Route::view('/_diagnostics/extension-recorder', 'diagnostics.extension-recorder')
        ->name('diagnostics.extension-recorder');
    Route::get('/_diagnostics/extension-preview', function () {
        return Inertia::render('Diagnostics/ExtensionPreview');
    })->name('diagnostics.extension-preview');
    Route::get('/_diagnostics/capture-widget', function () {
        return Inertia::render('Diagnostics/CaptureWidget', [
            'apiBaseUrl' => url('/'),
            'docsUrl' => route('docs.show', ['path' => 'capture']),
            'prefillPublicKey' => request()->string('public_key')->toString(),
        ]);
    })->name('diagnostics.capture-widget');
    Route::get('/_diagnostics/extension-recorder/ping', function () {
        return response()->json([
            'ok' => true,
            'kind' => request()->query('kind', 'unknown'),
            'captured_at' => now()->toIso8601String(),
        ]);
    })->name('diagnostics.extension-recorder.ping');
}

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/onboarding/organization', [OrganizationController::class, 'create'])->name('onboarding.organization');
    Route::post('/onboarding/organization', [OrganizationController::class, 'store'])->name('organizations.store');
    Route::post('/organizations/switch', [OrganizationController::class, 'switch'])->name('organizations.switch');
});

Route::middleware('auth')->group(function () {
    Route::get('/invitations/{token}', [InvitationController::class, 'show'])->name('invitations.show');
    Route::post('/invitations/{token}/accept', [InvitationController::class, 'accept'])->name('invitations.accept');
    Route::post('/invitations/{token}/reject', [InvitationController::class, 'reject'])->name('invitations.reject');
});

Route::middleware(['auth', 'verified', 'active.organization'])->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');
    Route::get('/bugs', BugBoardController::class)->name('bugs.index');
    Route::get('/bugs/{bugIssue}', [BugIssueController::class, 'show'])->name('bugs.show');
    Route::get('/bugs/{bugIssue}/handoff', [BugIssueController::class, 'handoff'])->name('bugs.handoff');
    Route::get('/reports/{bugReport}', [ReportController::class, 'show'])->name('reports.show');
    Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');
    Route::get('/settings/members', [SettingsController::class, 'members'])->name('settings.members');
    Route::get('/settings/billing', [SettingsController::class, 'billing'])->name('settings.billing');
    Route::get('/settings/capture-keys', [SettingsController::class, 'captureKeys'])->name('settings.capture-keys');
    Route::get('/settings/integrations', [SettingsController::class, 'integrations'])->name('settings.integrations');
    Route::get('/settings/extension/connect', [ExtensionConnectController::class, 'show'])->name('settings.extension.connect');
    Route::get('/settings/extension/captures', [ExtensionCaptureController::class, 'index'])->name('settings.extension.captures');
    Route::delete('/settings/extension/captures/{bugReport}', [ExtensionCaptureController::class, 'destroy'])->name('settings.extension.captures.destroy');
    Route::post('/invitations', [InvitationController::class, 'store'])->name('invitations.store');
    Route::delete('/invitations/{invitation}', [InvitationController::class, 'destroy'])->name('invitations.destroy');
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::get('/share/{shareToken}', [ShareController::class, 'show'])->name('reports.share');
Route::get('/bugs/share/{shareToken}', [BugIssueShareController::class, 'show'])->name('bugs.share');

require __DIR__.'/auth.php';
