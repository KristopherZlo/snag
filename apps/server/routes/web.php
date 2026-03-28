<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Web\DashboardController;
use App\Http\Controllers\Web\ExtensionConnectController;
use App\Http\Controllers\Web\InvitationController;
use App\Http\Controllers\Web\OrganizationController;
use App\Http\Controllers\Web\ReportController;
use App\Http\Controllers\Web\SettingsController;
use App\Http\Controllers\Web\ShareController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return auth()->check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
})->name('home');

if (app()->environment(['local', 'testing', 'e2e'])) {
    Route::view('/_diagnostics/extension-recorder', 'diagnostics.extension-recorder')
        ->name('diagnostics.extension-recorder');
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
    Route::get('/reports/{bugReport}', [ReportController::class, 'show'])->name('reports.show');
    Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');
    Route::get('/settings/members', [SettingsController::class, 'members'])->name('settings.members');
    Route::get('/settings/billing', [SettingsController::class, 'billing'])->name('settings.billing');
    Route::get('/settings/capture-keys', [SettingsController::class, 'captureKeys'])->name('settings.capture-keys');
    Route::get('/settings/extension/connect', [ExtensionConnectController::class, 'show'])->name('settings.extension.connect');
    Route::post('/invitations', [InvitationController::class, 'store'])->name('invitations.store');
    Route::delete('/invitations/{invitation}', [InvitationController::class, 'destroy'])->name('invitations.destroy');
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::get('/share/{shareToken}', [ShareController::class, 'show'])->name('reports.share');

require __DIR__.'/auth.php';
