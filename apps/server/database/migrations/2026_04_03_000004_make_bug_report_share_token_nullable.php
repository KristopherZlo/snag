<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bug_reports', function (Blueprint $table) {
            $table->string('share_token')->nullable()->change();
        });
    }

    public function down(): void
    {
        DB::table('bug_reports')
            ->whereNull('share_token')
            ->orderBy('id')
            ->get(['id'])
            ->each(function (object $report): void {
                DB::table('bug_reports')
                    ->where('id', $report->id)
                    ->update([
                        'share_token' => hash('sha256', 'restored-share-token-'.$report->id.'-'.Str::random(16)),
                    ]);
            });

        Schema::table('bug_reports', function (Blueprint $table) {
            $table->string('share_token')->change();
        });
    }
};
