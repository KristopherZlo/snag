<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UploadSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'user_id',
        'capture_key_id',
        'token',
        'finalize_token',
        'mode',
        'media_kind',
        'status',
        'allowed_origin',
        'artifacts',
        'meta',
        'expires_at',
        'consumed_at',
    ];

    protected function casts(): array
    {
        return [
            'artifacts' => 'array',
            'meta' => 'array',
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function captureKey(): BelongsTo
    {
        return $this->belongsTo(CaptureKey::class);
    }
}
