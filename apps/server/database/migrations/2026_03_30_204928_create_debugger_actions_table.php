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
        Schema::create('debugger_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bug_report_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('sequence');
            $table->string('type');
            $table->string('label')->nullable();
            $table->string('selector')->nullable();
            $table->text('value')->nullable();
            $table->json('payload')->nullable();
            $table->dateTime('happened_at')->nullable();
            $table->timestamps();

            $table->index(['bug_report_id', 'sequence']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('debugger_actions');
    }
};
