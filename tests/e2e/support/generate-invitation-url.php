<?php

declare(strict_types=1);

use App\Models\Invitation;
use Illuminate\Contracts\Console\Kernel;

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

$invitation = Invitation::query()
    ->where('email', strtolower(trim($email)))
    ->whereNull('accepted_at')
    ->latest('id')
    ->first();

if (! $invitation instanceof Invitation) {
    fwrite(STDERR, "Invitation not found for [$email].\n");
    exit(1);
}

fwrite(STDOUT, route('invitations.show', $invitation->token));
