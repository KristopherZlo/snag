<?php

namespace App\Services\Auth;

use App\Models\ExtensionConnectCode;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ExtensionConnectService
{
    public function issue(User $user, Organization $organization): string
    {
        $plainCode = Str::upper(Str::random(8));

        ExtensionConnectCode::query()->create([
            'user_id' => $user->id,
            'organization_id' => $organization->id,
            'code_hash' => hash('sha256', $plainCode),
            'abilities' => ['reports:create'],
            'expires_at' => now()->addMinutes((int) config('snag.capture.extension_code_ttl_minutes')),
        ]);

        return $plainCode;
    }

    public function exchange(string $code, string $deviceName): array
    {
        return DB::transaction(function () use ($code, $deviceName): array {
            $record = ExtensionConnectCode::query()
                ->where('code_hash', hash('sha256', Str::upper(trim($code))))
                ->whereNull('consumed_at')
                ->where('expires_at', '>', now())
                ->with(['user', 'organization'])
                ->lockForUpdate()
                ->first();

            if (! $record) {
                throw ValidationException::withMessages([
                    'code' => 'unauthenticated',
                ]);
            }

            $record->forceFill([
                'consumed_at' => now(),
            ])->save();

            $token = $record->user->createToken(
                'extension:'.$deviceName,
                $record->abilities ?? ['reports:create']
            );

            return [
                'token' => $token->plainTextToken,
                'organization' => [
                    'id' => $record->organization->id,
                    'name' => $record->organization->name,
                    'slug' => $record->organization->slug,
                ],
                'user' => [
                    'id' => $record->user->id,
                    'name' => $record->user->name,
                    'email' => $record->user->email,
                ],
            ];
        });
    }
}
