<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Runtime\Xampp\XamppConnectionActivator;
use App\Runtime\Xampp\XamppRuntimeProfile;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SetPasswordCommand extends Command
{
    protected $signature = 'snag:set-password
        {email : User email}
        {password : New plain-text password}
        {--xampp : Apply the change against the XAMPP MySQL profile instead of the default connection}';

    protected $description = 'Set the password for an existing user account.';

    public function handle(XamppConnectionActivator $xamppConnectionActivator): int
    {
        if ((bool) $this->option('xampp')) {
            $xamppConnectionActivator->activate(XamppRuntimeProfile::defaults());
        }

        $email = (string) $this->argument('email');
        $user = User::query()->where('email', $email)->first();

        if (! $user instanceof User) {
            $this->components->error("User [{$email}] was not found on connection [".DB::getDefaultConnection().'].');

            return self::FAILURE;
        }

        $user->password = (string) $this->argument('password');
        $user->save();

        $this->components->info("Updated password for [{$email}] on connection [".DB::getDefaultConnection().'].');

        return self::SUCCESS;
    }
}
