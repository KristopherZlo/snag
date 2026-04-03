<?php

namespace App\Models;

use App\Enums\OrganizationRole;
use App\Support\HashedToken;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invitation extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::saving(function (self $invitation): void {
            if (HashedToken::needsHashing($invitation->token)) {
                $invitation->token = self::hashToken($invitation->token);
            }
        });
    }

    protected $fillable = [
        'organization_id',
        'email',
        'role',
        'token',
        'invited_by_user_id',
        'accepted_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'role' => OrganizationRole::class,
            'accepted_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_user_id');
    }

    public function scopeForToken(Builder $query, string $token): Builder
    {
        return $query->where('token', self::hashToken($token));
    }

    public static function hashToken(string $token): string
    {
        return HashedToken::hash($token);
    }
}
