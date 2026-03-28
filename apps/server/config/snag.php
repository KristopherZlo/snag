<?php

return [
    'auth' => [
        'invitation_ttl_days' => env('INVITATION_TTL_DAYS', 7),
    ],
    'billing' => [
        'enabled' => env('BILLING_ENABLED', false),
        'stripe' => [
            'publishable_key' => env('STRIPE_KEY'),
            'secret_key' => env('STRIPE_SECRET'),
            'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
            'prices' => [
                'pro' => env('STRIPE_PRICE_PRO'),
                'studio' => env('STRIPE_PRICE_STUDIO'),
            ],
        ],
        'plans' => [
            'free' => [
                'members' => 3,
                'video_seconds' => 0,
                'can_record_video' => false,
            ],
            'pro' => [
                'members' => 10,
                'video_seconds' => 300,
                'can_record_video' => true,
            ],
            'studio' => [
                'members' => 50,
                'video_seconds' => 1800,
                'can_record_video' => true,
            ],
        ],
    ],
    'capture' => [
        'upload_session_ttl_minutes' => env('UPLOAD_SESSION_TTL_MINUTES', 15),
        'share_url_ttl_minutes' => env('SHARE_URL_TTL_MINUTES', 10),
        'extension_code_ttl_minutes' => env('EXTENSION_CODE_TTL_MINUTES', 10),
        'public_finalize_ttl_minutes' => env('PUBLIC_FINALIZE_TTL_MINUTES', 5),
    ],
    'storage' => [
        'artifact_disk' => env('ARTIFACT_DISK', env('FILESYSTEM_DISK', 'local')),
    ],
];
