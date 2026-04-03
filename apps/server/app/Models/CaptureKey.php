<?php

namespace App\Models;

use App\Enums\CaptureKeyStatus;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Crypt;

class CaptureKey extends Model
{
    use HasFactory;

    protected $hidden = [
        'relay_secret_encrypted',
    ];

    protected $fillable = [
        'organization_id',
        'created_by_user_id',
        'name',
        'public_key',
        'relay_secret',
        'status',
        'allowed_origins',
        'last_used_at',
        'revoked_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => CaptureKeyStatus::class,
            'allowed_origins' => 'array',
            'last_used_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    protected function relaySecret(): Attribute
    {
        return Attribute::make(
            get: fn ($value, array $attributes): ?string => filled($attributes['relay_secret_encrypted'] ?? null)
                ? Crypt::decryptString((string) $attributes['relay_secret_encrypted'])
                : null,
            set: fn (?string $value): array => [
                'relay_secret_encrypted' => filled($value)
                    ? Crypt::encryptString((string) $value)
                    : null,
            ],
        );
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function websiteWidget(): HasOne
    {
        return $this->hasOne(WebsiteWidget::class);
    }
}
