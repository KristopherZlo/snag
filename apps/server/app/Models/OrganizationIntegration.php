<?php

namespace App\Models;

use App\Enums\BugIssueExternalProvider;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
