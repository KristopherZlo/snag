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
        Schema::create('upload_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('capture_key_id')->nullable()->constrained()->nullOnDelete();
            $table->string('token')->unique();
            $table->string('finalize_token')->unique();
            $table->string('mode');
            $table->string('media_kind');
            $table->string('status')->default('pending');
            $table->string('allowed_origin')->nullable();
            $table->json('artifacts');
            $table->json('meta')->nullable();
            $table->dateTime('expires_at');
            $table->dateTime('consumed_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['capture_key_id', 'allowed_origin']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('upload_sessions');
    }
};
