<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Runtime\Xampp\XamppConnectionActivator;
use App\Runtime\Xampp\XamppRuntimeProfile;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class SetPasswordCommand extends Command
{
    protected $signature = 'snag:set-password
        {email : User email}
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

        $password = $this->secret('New password');
        $passwordConfirmation = $this->secret('Confirm new password');

        if (! is_string($password) || $password === '' || ! is_string($passwordConfirmation) || $passwordConfirmation === '') {
            $this->components->error('A password is required.');

            return self::FAILURE;
        }

        if (! hash_equals($password, $passwordConfirmation)) {
            $this->components->error('The password confirmation did not match.');

            return self::FAILURE;
        }

        $validator = Validator::make([
            'password' => $password,
        ], [
            'password' => ['required', Password::defaults()],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->components->error($message);
            }

            return self::FAILURE;
        }

        $user->password = $password;
        $user->save();

        $this->components->info("Updated password for [{$email}] on connection [".DB::getDefaultConnection().'].');

        return self::SUCCESS;
    }
}
