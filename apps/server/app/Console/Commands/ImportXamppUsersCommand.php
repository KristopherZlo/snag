<?php

namespace App\Console\Commands;

use App\Runtime\Xampp\XamppConnectionActivator;
use App\Runtime\Xampp\XamppRuntimeProfile;
use App\Services\Import\XamppUserSubscriptionImporter;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

class ImportXamppUsersCommand extends Command
{
    protected $signature = 'snag:import-xampp-users
        {--xampp : Import into the XAMPP MySQL profile target database}
        {--source-database=legacy_xampp : Legacy XAMPP source database name}
        {--source-connection= : Preconfigured source connection name}
        {--target-connection= : Target connection name; defaults to the current default connection}';

    protected $description = 'Import users, organizations, memberships, and subscriptions from the legacy XAMPP database into the Snag database.';

    public function handle(
        XamppConnectionActivator $xamppConnectionActivator,
        XamppUserSubscriptionImporter $importer,
    ): int {
        if ((bool) $this->option('xampp')) {
            $xamppConnectionActivator->activate(XamppRuntimeProfile::defaults());
        }

        $targetConnection = $this->resolveTargetConnection();
        $sourceConnection = $this->resolveSourceConnection($targetConnection);

        try {
            Artisan::call('migrate', [
                '--database' => $targetConnection,
                '--force' => true,
            ]);

            $result = $importer->import($sourceConnection, $targetConnection);

            foreach ($result->processed as $table => $count) {
                $this->components->twoColumnDetail($table, (string) $count);
            }

            $this->components->info(sprintf(
                'Imported %d rows from [%s] into [%s].',
                $result->totalRows(),
                $sourceConnection,
                $targetConnection,
            ));

            return self::SUCCESS;
        } finally {
            if ($sourceConnection === self::runtimeSourceConnectionName()) {
                DB::purge($sourceConnection);
                Config::set("database.connections.{$sourceConnection}", null);
            }
        }
    }

    private function resolveTargetConnection(): string
    {
        $targetConnection = (string) ($this->option('target-connection') ?: DB::getDefaultConnection());

        DB::connection($targetConnection)->getPdo();

        return $targetConnection;
    }

    private function resolveSourceConnection(string $targetConnection): string
    {
        $sourceConnection = (string) $this->option('source-connection');

        if ($sourceConnection !== '') {
            DB::connection($sourceConnection)->getPdo();

            return $sourceConnection;
        }

        $sourceDatabase = (string) $this->option('source-database');
        $targetConfig = Config::get("database.connections.{$targetConnection}");

        if (! is_array($targetConfig) || $targetConfig === []) {
            throw new \RuntimeException("Target connection [{$targetConnection}] is not configured.");
        }

        $targetConfig['database'] = $sourceDatabase;

        Config::set('database.connections.'.self::runtimeSourceConnectionName(), $targetConfig);
        DB::purge(self::runtimeSourceConnectionName());
        DB::connection(self::runtimeSourceConnectionName())->getPdo();

        return self::runtimeSourceConnectionName();
    }

    private static function runtimeSourceConnectionName(): string
    {
        return 'legacy_xampp_source';
    }
}
