<?php

namespace App\Models;

use App\Enums\BugIssueExternalProvider;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

class OrganizationIntegration extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'provider',
        'is_enabled',
        'webhook_secret',
        'config',
    ];

    protected function casts(): array
    {
        return [
            'provider' => BugIssueExternalProvider::class,
            'is_enabled' => 'boolean',
            'config' => 'encrypted:array',
        ];
    }

    protected function webhookSecret(): Attribute
    {
        return Attribute::make(
            get: function (?string $value, array $attributes): ?string {
                if (filled($attributes['webhook_secret_encrypted'] ?? null)) {
                    return Crypt::decryptString((string) $attributes['webhook_secret_encrypted']);
                }

                return $value;
            },
            set: fn (?string $value): array => [
                'webhook_secret' => null,
                'webhook_secret_encrypted' => filled($value)
                    ? Crypt::encryptString((string) $value)
                    : null,
            ],
        );
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
