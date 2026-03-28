<?php

namespace App\Runtime\Xampp;

use Illuminate\Support\Facades\DB;

class XamppConnectionActivator
{
    public function __construct(
        private readonly XamppDatabaseProvisioner $databaseProvisioner,
    ) {}

    public function activate(?XamppRuntimeProfile $profile = null): XamppRuntimeProfile
    {
        $profile ??= XamppRuntimeProfile::defaults();

        $this->databaseProvisioner->ensureDatabase($profile);
        config($profile->configOverrides());

        DB::purge('mysql');
        DB::setDefaultConnection('mysql');
        DB::connection('mysql')->getPdo();

        return $profile;
    }
}
