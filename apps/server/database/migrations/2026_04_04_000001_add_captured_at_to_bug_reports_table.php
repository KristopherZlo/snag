<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bug_reports', function (Blueprint $table) {
            $table->timestamp('captured_at')->nullable();
        });

        DB::table('bug_reports')
            ->select(['id', 'meta', 'created_at'])
            ->orderBy('id')
            ->chunkById(100, function ($reports): void {
                foreach ($reports as $report) {
                    $capturedAt = $this->resolveCapturedAt($report);

                    DB::table('bug_reports')
                        ->where('id', $report->id)
                        ->update([
                            'captured_at' => $capturedAt?->format('Y-m-d H:i:s'),
                        ]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('bug_reports', function (Blueprint $table) {
            $table->dropColumn('captured_at');
        });
    }

    private function resolveCapturedAt(object $report): ?CarbonImmutable
    {
        $meta = $this->decodeMeta($report->meta ?? null);

        return $this->firstValidTimestamp([
            data_get($meta, 'session_meta.captured_at'),
            data_get($meta, 'client_meta.captured_at'),
            data_get($meta, 'debugger.meta.captured_at'),
            data_get($meta, 'debugger.context.captured_at'),
            $report->created_at ?? null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeMeta(mixed $meta): array
    {
        if (is_array($meta)) {
            return $meta;
        }

        if (! is_string($meta) || trim($meta) === '') {
            return [];
        }

        try {
            $decoded = json_decode($meta, true, flags: JSON_THROW_ON_ERROR);

            return is_array($decoded) ? $decoded : [];
        } catch (Throwable) {
            return [];
        }
    }

    private function firstValidTimestamp(array $candidates): ?CarbonImmutable
    {
        foreach ($candidates as $candidate) {
            if ($candidate instanceof DateTimeInterface) {
                return CarbonImmutable::instance($candidate);
            }

            if (! is_string($candidate) || trim($candidate) === '') {
                continue;
            }

            try {
                return CarbonImmutable::parse($candidate);
            } catch (Throwable) {
                continue;
            }
        }

        return null;
    }
};
