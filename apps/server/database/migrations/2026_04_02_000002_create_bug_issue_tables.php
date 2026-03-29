<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bug_issues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('creator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('summary')->nullable();
            $table->string('workflow_state')->default('inbox');
            $table->string('urgency')->default('medium');
            $table->string('resolution')->default('unresolved');
            $table->json('labels')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'workflow_state'], 'bug_issues_org_workflow_idx');
            $table->index(['organization_id', 'urgency'], 'bug_issues_org_urgency_idx');
            $table->index(['organization_id', 'resolution'], 'bug_issues_org_resolution_idx');
            $table->index(['organization_id', 'assignee_id'], 'bug_issues_org_assignee_idx');
        });

        Schema::create('bug_issue_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bug_issue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bug_report_id')->constrained()->cascadeOnDelete();
            $table->foreignId('attached_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->unique('bug_report_id');
            $table->unique(['bug_issue_id', 'bug_report_id'], 'bug_issue_reports_issue_report_unique');
        });

        Schema::create('bug_issue_external_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bug_issue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('provider');
            $table->string('external_key');
            $table->string('external_id')->nullable();
            $table->text('external_url');
            $table->boolean('is_primary')->default(false);
            $table->string('sync_mode')->default('linked');
            $table->timestamp('last_synced_at')->nullable();
            $table->text('last_sync_error')->nullable();
            $table->json('external_snapshot')->nullable();
            $table->timestamps();

            $table->unique(['bug_issue_id', 'provider', 'external_key'], 'bug_issue_external_links_unique');
            $table->index(['provider', 'external_key'], 'bug_issue_external_provider_key_idx');
            $table->index(['provider', 'external_id'], 'bug_issue_external_provider_id_idx');
        });

        Schema::create('bug_issue_share_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bug_issue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name')->nullable();
            $table->string('token')->unique();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('last_accessed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('bug_issue_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bug_issue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('kind');
            $table->string('description');
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['bug_issue_id', 'created_at'], 'bug_issue_activities_issue_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bug_issue_activities');
        Schema::dropIfExists('bug_issue_share_tokens');
        Schema::dropIfExists('bug_issue_external_links');
        Schema::dropIfExists('bug_issue_reports');
        Schema::dropIfExists('bug_issues');
    }
};
