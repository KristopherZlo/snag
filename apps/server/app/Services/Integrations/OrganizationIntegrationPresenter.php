<?php

namespace App\Services\Integrations;

use App\Enums\BugIssueExternalProvider;
use App\Models\OrganizationIntegration;
use Illuminate\Support\Str;

class OrganizationIntegrationPresenter
{
    /**
     * @return array<string, mixed>
     */
    public function present(OrganizationIntegration $integration, array $oneTimeSecrets = []): array
    {
        $config = $integration->config ?? [];

        return [
            'id' => $integration->id,
            'provider' => $integration->provider->value,
            'is_enabled' => $integration->is_enabled,
            'config' => $this->maskConfig($integration->provider, $config),
            'config_has_values' => collect($config)
                ->mapWithKeys(fn ($value, $key) => [$key => filled($value)])
                ->all(),
            'has_sensitive_config' => collect($this->sensitiveConfigKeys($integration->provider))
                ->contains(fn ($key) => filled($config[$key] ?? null)),
            'has_webhook_secret' => filled($integration->webhook_secret),
            'webhook_secret_masked' => $this->maskValue($integration->webhook_secret),
            'one_time_secrets' => array_filter([
                'webhook_secret' => $oneTimeSecrets['webhook_secret'] ?? null,
            ], fn ($value) => filled($value)),
            'webhook_url' => match ($integration->provider) {
                BugIssueExternalProvider::GitHub => route('api.v1.webhooks.github', $integration),
                BugIssueExternalProvider::Jira => route('api.v1.webhooks.jira', $integration),
                default => null,
            },
        ];
    }

    /**
     * @param  array<string, mixed>  $incomingConfig
     * @param  array<string, mixed>  $existingConfig
     * @return array<string, mixed>
     */
    public function mergeForSave(
        BugIssueExternalProvider $provider,
        array $incomingConfig,
        array $existingConfig = [],
    ): array {
        $merged = $existingConfig;

        foreach ($incomingConfig as $key => $value) {
            if (
                in_array($key, $this->sensitiveConfigKeys($provider), true)
                && $this->shouldKeepExistingValue($existingConfig[$key] ?? null, $value)
            ) {
                continue;
            }

            $merged[$key] = $value;
        }

        return $merged;
    }

    /**
     * @return array{value: ?string, revealed: ?string}
     */
    public function resolveWebhookSecret(?string $existingSecret, bool $rotate = false): array
    {
        if ($rotate || blank($existingSecret)) {
            $secret = Str::random(40);

            return [
                'value' => $secret,
                'revealed' => $secret,
            ];
        }

        return [
            'value' => $existingSecret,
            'revealed' => null,
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    private function maskConfig(BugIssueExternalProvider $provider, array $config): array
    {
        $sensitiveKeys = $this->sensitiveConfigKeys($provider);

        return collect($config)
            ->mapWithKeys(function ($value, $key) use ($sensitiveKeys) {
                if (! in_array($key, $sensitiveKeys, true)) {
                    return [$key => $value];
                }

                return [$key => $this->maskValue(is_scalar($value) ? (string) $value : null)];
            })
            ->all();
    }

    /**
     * @return array<int, string>
     */
    private function sensitiveConfigKeys(BugIssueExternalProvider $provider): array
    {
        return match ($provider) {
            BugIssueExternalProvider::GitHub => ['token'],
            BugIssueExternalProvider::Jira => ['email', 'api_token'],
            default => [],
        };
    }

    private function shouldKeepExistingValue(mixed $existingValue, mixed $incomingValue): bool
    {
        if (! is_scalar($existingValue) || ! filled($existingValue) || ! is_scalar($incomingValue)) {
            return false;
        }

        $incoming = trim((string) $incomingValue);

        return $incoming === ''
            || hash_equals((string) $this->maskValue((string) $existingValue), $incoming);
    }

    private function maskValue(?string $value): ?string
    {
        if (! filled($value)) {
            return null;
        }

        $normalized = trim($value);
        $visibleSuffix = Str::length($normalized) > 4
            ? Str::substr($normalized, -4)
            : '';

        return str_repeat('*', max(Str::length($normalized) - Str::length($visibleSuffix), 8)).$visibleSuffix;
    }
}
