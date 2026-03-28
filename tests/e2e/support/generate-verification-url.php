<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\URL;

require __DIR__.'/../../../apps/server/vendor/autoload.php';

$app = require __DIR__.'/../../../apps/server/bootstrap/app.php';

/** @var Kernel $kernel */
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$email = $argv[1] ?? null;

if (! is_string($email) || trim($email) === '') {
    fwrite(STDERR, "Missing email argument.\n");
    exit(1);
}

$user = User::query()->where('email', $email)->first();

if (! $user instanceof User) {
    fwrite(STDERR, "User not found for [$email].\n");
    exit(1);
}

$url = URL::temporarySignedRoute(
    'verification.verify',
    now()->addMinutes((int) config('auth.verification.expire', 60)),
    [
        'id' => $user->getKey(),
        'hash' => sha1($user->getEmailForVerification()),
    ],
);

fwrite(STDOUT, $url);
