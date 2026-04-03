<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bug_issue_external_links', function (Blueprint $table) {
            $table->foreignId('organization_id')
                ->nullable()
                ->after('bug_issue_id')
                ->constrained()
                ->cascadeOnDelete();
        });

        DB::table('bug_issue_external_links')
            ->select(['id', 'bug_issue_id'])
            ->orderBy('id')
            ->chunkById(100, function ($links): void {
                $organizationIds = DB::table('bug_issues')
                    ->whereIn('id', collect($links)->pluck('bug_issue_id')->all())
                    ->pluck('organization_id', 'id');

                foreach ($links as $link) {
                    DB::table('bug_issue_external_links')
                        ->where('id', $link->id)
                        ->update([
                            'organization_id' => $organizationIds[$link->bug_issue_id] ?? null,
                        ]);
                }
            });

        Schema::table('bug_issue_external_links', function (Blueprint $table) {
            $table->dropIndex('bug_issue_external_provider_key_idx');
            $table->dropIndex('bug_issue_external_provider_id_idx');
            $table->index(['organization_id', 'provider', 'external_key'], 'bug_issue_external_org_provider_key_idx');
            $table->index(['organization_id', 'provider', 'external_id'], 'bug_issue_external_org_provider_id_idx');
        });
    }

    public function down(): void
    {
        Schema::table('bug_issue_external_links', function (Blueprint $table) {
            $table->dropIndex('bug_issue_external_org_provider_key_idx');
            $table->dropIndex('bug_issue_external_org_provider_id_idx');
            $table->index(['provider', 'external_key'], 'bug_issue_external_provider_key_idx');
            $table->index(['provider', 'external_id'], 'bug_issue_external_provider_id_idx');
            $table->dropConstrainedForeignId('organization_id');
        });
    }
};
