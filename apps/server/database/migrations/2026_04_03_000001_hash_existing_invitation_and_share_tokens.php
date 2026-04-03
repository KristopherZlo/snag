<?php

use App\Support\HashedToken;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $this->hashColumn('invitations', 'token');
        $this->hashColumn('bug_issue_share_tokens', 'token');
        $this->hashColumn('bug_reports', 'share_token');
    }

    public function down(): void
    {
        // Irreversible: raw bearer tokens are intentionally not recoverable after hashing.
    }

    private function hashColumn(string $table, string $column): void
    {
        DB::table($table)
            ->select(['id', $column])
            ->orderBy('id')
            ->chunkById(100, function ($rows) use ($table, $column): void {
                foreach ($rows as $row) {
                    $value = $row->{$column};

                    if (! HashedToken::needsHashing($value)) {
                        continue;
                    }

                    DB::table($table)
                        ->where('id', $row->id)
                        ->update([$column => HashedToken::hash($value)]);
                }
            });
    }
};
