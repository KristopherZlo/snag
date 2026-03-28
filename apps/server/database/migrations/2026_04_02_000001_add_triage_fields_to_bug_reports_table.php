<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('bug_reports', function (Blueprint $table) {
            $table->string('workflow_state')->default('todo')->after('status');
            $table->string('urgency')->default('medium')->after('workflow_state');
            $table->string('triage_tag')->default('unresolved')->after('urgency');

            $table->index(['organization_id', 'workflow_state'], 'bug_reports_org_workflow_state_idx');
            $table->index(['organization_id', 'urgency'], 'bug_reports_org_urgency_idx');
            $table->index(['organization_id', 'triage_tag'], 'bug_reports_org_triage_tag_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bug_reports', function (Blueprint $table) {
            $table->dropIndex('bug_reports_org_workflow_state_idx');
            $table->dropIndex('bug_reports_org_urgency_idx');
            $table->dropIndex('bug_reports_org_triage_tag_idx');
            $table->dropColumn(['workflow_state', 'urgency', 'triage_tag']);
        });
    }
};
