<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organization_integrations', function (Blueprint $table) {
            $table->longText('webhook_secret_encrypted')->nullable()->after('webhook_secret');
        });

        DB::table('organization_integrations')
            ->select(['id', 'webhook_secret', 'webhook_secret_encrypted'])
            ->orderBy('id')
            ->chunkById(100, function ($rows): void {
                foreach ($rows as $row) {
                    if (filled($row->webhook_secret_encrypted) || blank($row->webhook_secret)) {
                        continue;
                    }

                    DB::table('organization_integrations')
                        ->where('id', $row->id)
                        ->update([
                            'webhook_secret_encrypted' => Crypt::encryptString((string) $row->webhook_secret),
                            'webhook_secret' => null,
                        ]);
                }
            });
    }

    public function down(): void
    {
        DB::table('organization_integrations')
            ->select(['id', 'webhook_secret_encrypted'])
            ->whereNotNull('webhook_secret_encrypted')
            ->orderBy('id')
            ->chunkById(100, function ($rows): void {
                foreach ($rows as $row) {
                    DB::table('organization_integrations')
                        ->where('id', $row->id)
                        ->update([
                            'webhook_secret' => Crypt::decryptString((string) $row->webhook_secret_encrypted),
                        ]);
                }
            });

        Schema::table('organization_integrations', function (Blueprint $table) {
            $table->dropColumn('webhook_secret_encrypted');
        });
    }
};
