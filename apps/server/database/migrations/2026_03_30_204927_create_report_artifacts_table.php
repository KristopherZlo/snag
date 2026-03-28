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
        Schema::create('report_artifacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bug_report_id')->constrained()->cascadeOnDelete();
            $table->string('kind');
            $table->string('disk');
            $table->string('path');
            $table->string('content_type');
            $table->unsignedBigInteger('byte_size')->default(0);
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->string('checksum')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique(['bug_report_id', 'kind']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_artifacts');
    }
};
