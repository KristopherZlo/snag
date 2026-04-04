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
        'extension_token_ttl_minutes' => env('EXTENSION_TOKEN_TTL_MINUTES', 10080),
        'extension_exchange' => [
            'max_attempts' => env('EXTENSION_EXCHANGE_RATE_LIMIT', 5),
            'decay_seconds' => env('EXTENSION_EXCHANGE_RATE_DECAY_SECONDS', 60),
        ],
        'public_finalize_ttl_minutes' => env('PUBLIC_FINALIZE_TTL_MINUTES', 5),
        'public' => [
            'rate_limits' => [
                'token' => [
                    'max_attempts' => env('PUBLIC_CAPTURE_TOKEN_RATE_LIMIT', 20),
                    'decay_seconds' => env('PUBLIC_CAPTURE_TOKEN_RATE_DECAY_SECONDS', 60),
                ],
                'create' => [
                    'max_attempts' => env('PUBLIC_CAPTURE_CREATE_RATE_LIMIT', 10),
                    'decay_seconds' => env('PUBLIC_CAPTURE_CREATE_RATE_DECAY_SECONDS', 60),
                ],
                'finalize' => [
                    'max_attempts' => env('PUBLIC_CAPTURE_FINALIZE_RATE_LIMIT', 10),
                    'decay_seconds' => env('PUBLIC_CAPTURE_FINALIZE_RATE_DECAY_SECONDS', 60),
                ],
            ],
            'artifacts' => [
                'screenshot' => [
                    'max_bytes' => env('PUBLIC_CAPTURE_MAX_SCREENSHOT_BYTES', 5 * 1024 * 1024),
                    'mime_types' => ['image/png'],
                ],
                'video' => [
                    'max_bytes' => env('PUBLIC_CAPTURE_MAX_VIDEO_BYTES', 25 * 1024 * 1024),
                    'mime_types' => ['video/webm', 'application/octet-stream'],
                ],
                'debugger' => [
                    'max_bytes' => env('PUBLIC_CAPTURE_MAX_DEBUGGER_BYTES', 1024 * 1024),
                    'mime_types' => ['application/json', 'text/plain'],
                ],
                'max_debugger_items' => env('PUBLIC_CAPTURE_MAX_DEBUGGER_ITEMS', 500),
            ],
            'cleanup' => [
                'orphan_grace_minutes' => env('PUBLIC_CAPTURE_ORPHAN_GRACE_MINUTES', 60),
                'batch_size' => env('PUBLIC_CAPTURE_CLEANUP_BATCH_SIZE', 100),
            ],
        ],
    ],
    'storage' => [
        'artifact_disk' => env('ARTIFACT_DISK', env('FILESYSTEM_DISK', 'local')),
    ],
    'localization' => [
        'cookie_name' => env('LOCALE_COOKIE', 'snag_locale'),
        'cookie_minutes' => env('LOCALE_COOKIE_MINUTES', 60 * 24 * 365),
        'supported_locales' => [
            ['code' => 'en', 'name' => 'English', 'native_name' => 'English'],
            ['code' => 'fi', 'name' => 'Finnish', 'native_name' => 'Suomi'],
            ['code' => 'ru', 'name' => 'Russian', 'native_name' => 'Русский'],
            ['code' => 'uk', 'name' => 'Ukrainian', 'native_name' => 'Українська'],
            ['code' => 'sv', 'name' => 'Swedish', 'native_name' => 'Svenska'],
            ['code' => 'de', 'name' => 'German', 'native_name' => 'Deutsch'],
            ['code' => 'es', 'name' => 'Spanish', 'native_name' => 'Español'],
            ['code' => 'it', 'name' => 'Italian', 'native_name' => 'Italiano'],
        ],
    ],
];
