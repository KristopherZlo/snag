<?php

namespace App\Services\WebsiteWidgets;

class WebsiteWidgetConfigService
{
    public function defaults(): array
    {
        return [
            'launcher' => [
                'label' => 'Report a bug',
            ],
            'intro' => [
                'title' => 'Found something broken?',
                'body' => 'We can send a screenshot of this page to our support team. First click Continue. Then click the camera button. After that you can add a short note and send it.',
                'continue_label' => 'Continue',
                'cancel_label' => 'Not now',
            ],
            'helper' => [
                'text' => 'Click the camera to take a screenshot of this page.',
            ],
            'review' => [
                'title' => 'Add a short note',
                'body' => 'Tell us what you were trying to do and what went wrong.',
                'placeholder' => 'For example: I clicked Pay, but nothing happened.',
                'send_label' => 'Send report',
                'cancel_label' => 'Cancel',
                'retake_label' => 'Retake',
            ],
            'success' => [
                'title' => 'Thank you',
                'body' => 'Your report was sent to our support team.',
                'done_label' => 'Done',
            ],
            'meta' => [
                'support_team_name' => 'Support team',
                'site_label' => 'Website',
            ],
            'theme' => [
                'accent_color' => '#d97706',
                'mode' => 'auto',
                'offset_x' => 20,
                'offset_y' => 20,
                'icon_style' => 'camera',
            ],
        ];
    }

    public function normalize(?array $config): array
    {
        $merged = $this->mergeRecursive($this->defaults(), is_array($config) ? $config : []);

        return [
            'launcher' => [
                'label' => $this->stringValue($merged, ['launcher', 'label']),
            ],
            'intro' => [
                'title' => $this->stringValue($merged, ['intro', 'title']),
                'body' => $this->stringValue($merged, ['intro', 'body']),
                'continue_label' => $this->stringValue($merged, ['intro', 'continue_label']),
                'cancel_label' => $this->stringValue($merged, ['intro', 'cancel_label']),
            ],
            'helper' => [
                'text' => $this->stringValue($merged, ['helper', 'text']),
            ],
            'review' => [
                'title' => $this->stringValue($merged, ['review', 'title']),
                'body' => $this->stringValue($merged, ['review', 'body']),
                'placeholder' => $this->stringValue($merged, ['review', 'placeholder']),
                'send_label' => $this->stringValue($merged, ['review', 'send_label']),
                'cancel_label' => $this->stringValue($merged, ['review', 'cancel_label']),
                'retake_label' => $this->stringValue($merged, ['review', 'retake_label']),
            ],
            'success' => [
                'title' => $this->stringValue($merged, ['success', 'title']),
                'body' => $this->stringValue($merged, ['success', 'body']),
                'done_label' => $this->stringValue($merged, ['success', 'done_label']),
            ],
            'meta' => [
                'support_team_name' => $this->stringValue($merged, ['meta', 'support_team_name']),
                'site_label' => $this->stringValue($merged, ['meta', 'site_label']),
            ],
            'theme' => [
                'accent_color' => $this->stringValue($merged, ['theme', 'accent_color']),
                'mode' => $this->stringValue($merged, ['theme', 'mode']),
                'offset_x' => $this->intValue($merged, ['theme', 'offset_x']),
                'offset_y' => $this->intValue($merged, ['theme', 'offset_y']),
                'icon_style' => $this->stringValue($merged, ['theme', 'icon_style']),
            ],
        ];
    }

    private function mergeRecursive(array $defaults, array $input): array
    {
        $merged = $defaults;

        foreach ($input as $key => $value) {
            if (is_array($value) && is_array($merged[$key] ?? null)) {
                $merged[$key] = $this->mergeRecursive($merged[$key], $value);
                continue;
            }

            $merged[$key] = $value;
        }

        return $merged;
    }

    /**
     * @param  array<int, string>  $path
     */
    private function stringValue(array $source, array $path): string
    {
        $value = data_get($source, implode('.', $path));

        return trim(is_string($value) ? $value : '');
    }

    /**
     * @param  array<int, string>  $path
     */
    private function intValue(array $source, array $path): int
    {
        return (int) data_get($source, implode('.', $path));
    }
}
