<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

class ExtensionSessionService
{
    public function extensionTokenName(string $deviceName): string
    {
        $normalizedDeviceName = Str::limit(Str::squish($deviceName), 80, '');

        if ($normalizedDeviceName === '') {
            $normalizedDeviceName = 'Chromium extension';
        }

        return 'extension:'.$normalizedDeviceName;
    }

    public function revokeNamedSessions(User $user, string $deviceName): void
    {
        $user->tokens()
            ->where('name', $this->extensionTokenName($deviceName))
            ->delete();
    }

    public function revokeCurrentSession(User $user, PersonalAccessToken $token): void
    {
        if (! $this->belongsToUser($user, $token) || ! $this->isExtensionToken($token)) {
            abort(403, 'extension_session_required');
        }

        $token->delete();
    }

    public function revokeById(User $user, int $tokenId): void
    {
        $token = $user->tokens()
            ->whereKey($tokenId)
            ->firstOrFail();

        if (! $this->isExtensionToken($token)) {
            abort(404);
        }

        $token->delete();
    }

    /**
     * @return Collection<int, array{id: int, device_name: string, created_at: string|null, last_used_at: string|null, expires_at: string|null}>
     */
    public function sessionsFor(User $user): Collection
    {
        $this->pruneExpiredSessions($user);

        return $user->tokens()
            ->where('name', 'like', 'extension:%')
            ->orderByDesc('last_used_at')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (PersonalAccessToken $token) => [
                'id' => $token->getKey(),
                'device_name' => Str::after($token->name, 'extension:'),
                'created_at' => optional($token->created_at)->toIso8601String(),
                'last_used_at' => optional($token->last_used_at)->toIso8601String(),
                'expires_at' => optional($token->expires_at)->toIso8601String(),
            ]);
    }

    public function isExtensionToken(PersonalAccessToken $token): bool
    {
        return Str::startsWith($token->name, 'extension:');
    }

    private function pruneExpiredSessions(User $user): void
    {
        $user->tokens()
            ->where('name', 'like', 'extension:%')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->delete();
    }

    private function belongsToUser(User $user, PersonalAccessToken $token): bool
    {
        return $token->tokenable_type === $user->getMorphClass()
            && (int) $token->tokenable_id === (int) $user->getKey();
    }
}
