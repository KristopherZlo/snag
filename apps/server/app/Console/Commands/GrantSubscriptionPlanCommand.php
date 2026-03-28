<?php

namespace App\Console\Commands;

use App\Enums\BillingPlan;
use App\Enums\OrganizationRole;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\SubscriptionState;
use App\Models\User;
use App\Runtime\Xampp\XamppConnectionActivator;
use App\Runtime\Xampp\XamppRuntimeProfile;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GrantSubscriptionPlanCommand extends Command
{
    protected $signature = 'snag:grant-plan
        {email : User email}
        {plan=studio : Target plan (free, pro, studio)}
        {--create-missing : Create a verified user and default organization when the email does not exist}
        {--xampp : Apply the change against the XAMPP MySQL profile instead of the default connection}';

    protected $description = 'Grant a billing plan to the active organization of a user.';

    public function handle(XamppConnectionActivator $xamppConnectionActivator): int
    {
        $plan = BillingPlan::tryFrom((string) $this->argument('plan'));

        if (! $plan instanceof BillingPlan) {
            $this->components->error('Unknown plan. Allowed values: free, pro, studio.');

            return self::FAILURE;
        }

        if ((bool) $this->option('xampp')) {
            $this->activateXamppConnection($xamppConnectionActivator);
        }

        Artisan::call('migrate', ['--force' => true]);

        $email = (string) $this->argument('email');
        $user = User::query()->where('email', $email)->first();

        if (! $user instanceof User && ! (bool) $this->option('create-missing')) {
            $this->components->error("User [{$email}] was not found.");

            return self::FAILURE;
        }

        if (! $user instanceof User) {
            $user = $this->createUser($email);
            $this->components->warn("User [{$email}] did not exist and was created with password [password].");
        }

        $organization = $this->resolveOrganization($user);

        if (! $organization instanceof Organization && ! (bool) $this->option('create-missing')) {
            $this->components->error("User [{$email}] has no active or accessible organization.");

            return self::FAILURE;
        }

        if (! $organization instanceof Organization) {
            $organization = $this->createOrganization($user);
            $this->components->warn("Created default organization [{$organization->name}] for [{$email}].");
        }

        $entitlements = config("snag.billing.plans.{$plan->value}");

        if (! is_array($entitlements)) {
            $this->components->error("Billing plan [{$plan->value}] is not configured.");

            return self::FAILURE;
        }

        $subscription = SubscriptionState::query()->updateOrCreate(
            ['organization_id' => $organization->getKey()],
            [
                'plan' => $plan->value,
                'provider' => 'manual',
                'provider_customer_id' => null,
                'provider_subscription_id' => null,
                'status' => $plan === BillingPlan::Free ? 'free' : 'active',
                'entitlements' => $entitlements,
                'current_period_ends_at' => null,
                'cancel_at_period_end' => false,
                'last_projected_at' => now(),
            ]
        );

        $this->components->info(sprintf(
            'Granted [%s] to [%s] on organization [%s] via connection [%s].',
            $subscription->plan->value,
            $email,
            $organization->name,
            DB::getDefaultConnection(),
        ));

        return self::SUCCESS;
    }

    private function activateXamppConnection(XamppConnectionActivator $xamppConnectionActivator): void
    {
        $xamppConnectionActivator->activate(XamppRuntimeProfile::defaults());
    }

    private function createOrganization(User $user): Organization
    {
        $baseName = Str::headline(Str::before($user->email, '@'));
        $name = trim($baseName) !== '' ? "{$baseName} Workspace" : 'Snag Workspace';

        $organization = Organization::query()->create([
            'owner_id' => $user->getKey(),
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
            'billing_email' => $user->email,
        ]);

        Membership::query()->create([
            'organization_id' => $organization->getKey(),
            'user_id' => $user->getKey(),
            'role' => OrganizationRole::Owner->value,
            'invited_by_user_id' => $user->getKey(),
            'joined_at' => now(),
        ]);

        $user->forceFill([
            'active_organization_id' => $organization->getKey(),
        ])->save();

        return $organization;
    }

    private function createUser(string $email): User
    {
        $user = User::query()->create([
            'name' => Str::headline(Str::before($email, '@')),
            'email' => $email,
            'password' => 'password',
        ]);

        $user->forceFill([
            'email_verified_at' => now(),
        ])->save();

        return $user;
    }

    private function resolveOrganization(User $user): ?Organization
    {
        if ($user->activeOrganization()->exists()) {
            return $user->activeOrganization()->first();
        }

        if ($user->ownedOrganizations()->exists()) {
            return $user->ownedOrganizations()->first();
        }

        return $user->organizations()->first();
    }
}
