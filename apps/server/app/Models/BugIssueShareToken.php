<?php

namespace App\Models;

use App\Support\HashedToken;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BugIssueShareToken extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::saving(function (self $shareToken): void {
            if (HashedToken::needsHashing($shareToken->token)) {
                $shareToken->token = self::hashToken($shareToken->token);
            }
        });
    }

    protected $fillable = [
        'bug_issue_id',
        'created_by_user_id',
        'name',
        'token',
        'expires_at',
        'revoked_at',
        'last_accessed_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
            'last_accessed_at' => 'datetime',
        ];
    }

    public function issue(): BelongsTo
    {
        return $this->belongsTo(BugIssue::class, 'bug_issue_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
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
