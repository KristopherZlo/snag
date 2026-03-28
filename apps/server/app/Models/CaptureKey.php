<?php

namespace App\Models;

use App\Enums\CaptureKeyStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CaptureKey extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'created_by_user_id',
        'name',
        'public_key',
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

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
