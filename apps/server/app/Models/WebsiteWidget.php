<?php

namespace App\Models;

use App\Enums\WebsiteWidgetStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebsiteWidget extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'created_by_user_id',
        'capture_key_id',
        'public_id',
        'name',
        'status',
        'allowed_origins',
        'config',
    ];

    protected function casts(): array
    {
        return [
            'status' => WebsiteWidgetStatus::class,
            'allowed_origins' => 'array',
            'config' => 'array',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function captureKey(): BelongsTo
    {
        return $this->belongsTo(CaptureKey::class);
    }
}
