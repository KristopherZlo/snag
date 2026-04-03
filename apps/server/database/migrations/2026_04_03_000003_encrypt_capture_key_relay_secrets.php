<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('capture_keys', function (Blueprint $table) {
            $table->longText('relay_secret_encrypted')->nullable()->after('public_key');
        });
    }

    public function down(): void
    {
        Schema::table('capture_keys', function (Blueprint $table) {
            $table->dropColumn('relay_secret_encrypted');
        });
    }
};
