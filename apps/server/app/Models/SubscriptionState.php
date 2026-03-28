<?php

namespace App\Models;

use App\Enums\BillingPlan;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionState extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'plan',
        'provider',
        'provider_customer_id',
        'provider_subscription_id',
        'status',
        'entitlements',
        'current_period_ends_at',
        'cancel_at_period_end',
        'last_projected_at',
    ];

    protected function casts(): array
    {
        return [
            'plan' => BillingPlan::class,
            'entitlements' => 'array',
            'current_period_ends_at' => 'datetime',
            'cancel_at_period_end' => 'boolean',
            'last_projected_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
