<?php

namespace App\Http\Requests\Api\V1\WebsiteWidgets;

final class WebsiteWidgetRules
{
    public static function forStore(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'in:active,disabled'],
            'allowed_origins' => ['required', 'array', 'min:1'],
            'allowed_origins.*' => ['required', 'url'],
            ...self::configRules(['nullable']),
        ];
    }

    public static function forUpdate(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'in:active,disabled'],
            'allowed_origins' => ['sometimes', 'array', 'min:1'],
            'allowed_origins.*' => ['required_with:allowed_origins', 'url'],
            ...self::configRules(['sometimes']),
        ];
    }

    /**
     * @param  array<int, string>  $presence
     * @return array<string, array<int, string>>
     */
    private static function configRules(array $presence): array
    {
        return [
            'config' => [...$presence, 'array'],
            'config.launcher' => ['sometimes', 'array'],
            'config.launcher.label' => ['sometimes', 'string', 'max:80'],
            'config.intro' => ['sometimes', 'array'],
            'config.intro.title' => ['sometimes', 'string', 'max:120'],
            'config.intro.body' => ['sometimes', 'string', 'max:500'],
            'config.intro.continue_label' => ['sometimes', 'string', 'max:40'],
            'config.intro.cancel_label' => ['sometimes', 'string', 'max:40'],
            'config.helper' => ['sometimes', 'array'],
            'config.helper.text' => ['sometimes', 'string', 'max:140'],
            'config.review' => ['sometimes', 'array'],
            'config.review.title' => ['sometimes', 'string', 'max:120'],
            'config.review.body' => ['sometimes', 'string', 'max:240'],
            'config.review.placeholder' => ['sometimes', 'string', 'max:240'],
            'config.review.send_label' => ['sometimes', 'string', 'max:40'],
            'config.review.cancel_label' => ['sometimes', 'string', 'max:40'],
            'config.review.retake_label' => ['sometimes', 'string', 'max:40'],
            'config.success' => ['sometimes', 'array'],
            'config.success.title' => ['sometimes', 'string', 'max:120'],
            'config.success.body' => ['sometimes', 'string', 'max:240'],
            'config.success.done_label' => ['sometimes', 'string', 'max:40'],
            'config.meta' => ['sometimes', 'array'],
            'config.meta.support_team_name' => ['sometimes', 'string', 'max:120'],
            'config.meta.site_label' => ['sometimes', 'string', 'max:120'],
            'config.theme' => ['sometimes', 'array'],
            'config.theme.accent_color' => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'config.theme.mode' => ['sometimes', 'string', 'in:light,dark,auto'],
            'config.theme.offset_x' => ['sometimes', 'integer', 'min:12', 'max:64'],
            'config.theme.offset_y' => ['sometimes', 'integer', 'min:12', 'max:64'],
            'config.theme.icon_style' => ['sometimes', 'string', 'in:camera,bug,feedback'],
        ];
    }
}
