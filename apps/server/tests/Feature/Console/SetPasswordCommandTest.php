<?php

namespace Tests\Feature\Console;

use App\Models\User;
use App\Runtime\Xampp\XamppConnectionActivator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SetPasswordCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_updates_the_password_for_an_existing_user(): void
    {
        $user = User::factory()->create([
            'email' => 'test@mail.com',
            'password' => 'password',
        ]);

        $this->artisan('snag:set-password', [
            'email' => 'test@mail.com',
        ])
            ->expectsQuestion('New password', 'StrongerPass123!')
            ->expectsQuestion('Confirm new password', 'StrongerPass123!')
            ->assertSuccessful();

        $this->assertTrue(Hash::check('StrongerPass123!', $user->fresh()->password));
    }

    public function test_it_reports_a_missing_user(): void
    {
        $this->artisan('snag:set-password', [
            'email' => 'missing@mail.com',
        ])->assertFailed();
    }

    public function test_it_can_activate_the_xampp_connection_before_updating_the_password(): void
    {
        User::factory()->create([
            'email' => 'test@mail.com',
            'password' => 'password',
        ]);

        $this->mock(XamppConnectionActivator::class, function ($mock): void {
            $mock->shouldReceive('activate')->once();
        });

        $this->artisan('snag:set-password', [
            'email' => 'test@mail.com',
            '--xampp' => true,
        ])
            ->expectsQuestion('New password', 'StrongerPass123!')
            ->expectsQuestion('Confirm new password', 'StrongerPass123!')
            ->assertSuccessful();

        $user = User::query()->where('email', 'test@mail.com')->firstOrFail();

        $this->assertTrue(Hash::check('StrongerPass123!', $user->password));
    }

    public function test_it_rejects_mismatched_password_confirmation(): void
    {
        User::factory()->create([
            'email' => 'test@mail.com',
            'password' => 'password',
        ]);

        $this->artisan('snag:set-password', [
            'email' => 'test@mail.com',
        ])
            ->expectsQuestion('New password', 'StrongerPass123!')
            ->expectsQuestion('Confirm new password', 'DifferentPass123!')
            ->assertFailed();
    }
}
