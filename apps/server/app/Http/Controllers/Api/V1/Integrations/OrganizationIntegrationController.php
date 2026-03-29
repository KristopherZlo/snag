<?php

namespace App\Http\Controllers\Api\V1\Integrations;

use App\Enums\BugIssueExternalProvider;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Integrations\StoreOrganizationIntegrationRequest;
use App\Models\Organization;
use App\Models\OrganizationIntegration;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrganizationIntegrationController extends Controller
{
    public function store(StoreOrganizationIntegrationRequest $request): JsonResponse
    {
        /** @var Organization $organization */
        $organization = $request->attributes->get('organization');
        $provider = BugIssueExternalProvider::from($request->validated('provider'));
        $this->ensureManagerRole($organization, $request->user()->id);
        $this->validateProviderConfig($provider, $request->validated('config') ?? []);

        $integration = OrganizationIntegration::query()->firstOrNew([
            'organization_id' => $organization->id,
            'provider' => $provider->value,
        ]);

        $integration->fill([
            'is_enabled' => (bool) $request->validated('is_enabled'),
            'config' => $request->validated('config') ?? [],
            'webhook_secret' => $integration->webhook_secret ?: Str::random(40),
        ])->save();

        return response()->json([
            'integration' => $this->payload($integration),
        ]);
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function validateProviderConfig(BugIssueExternalProvider $provider, array $config): void
    {
        if ($provider === BugIssueExternalProvider::Jira) {
            foreach (['base_url', 'email', 'api_token', 'project_key'] as $field) {
                if (blank($config[$field] ?? null)) {
                    throw ValidationException::withMessages([
                        "config.{$field}" => 'This field is required for Jira.',
                    ]);
                }
            }

            return;
        }

        if ($provider === BugIssueExternalProvider::GitHub) {
            foreach (['repository', 'token'] as $field) {
                if (blank($config[$field] ?? null)) {
                    throw ValidationException::withMessages([
                        "config.{$field}" => 'This field is required for GitHub.',
                    ]);
                }
            }
        }
    }

    private function ensureManagerRole(Organization $organization, int $userId): void
    {
        $allowed = $organization->memberships()
            ->where('user_id', $userId)
            ->whereIn('role', ['owner', 'admin'])
            ->exists();

        abort_unless($allowed, 403);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(OrganizationIntegration $integration): array
    {
        return [
            'id' => $integration->id,
            'provider' => $integration->provider->value,
            'is_enabled' => $integration->is_enabled,
            'config' => $integration->config ?? [],
            'webhook_secret' => $integration->webhook_secret,
            'webhook_url' => match ($integration->provider) {
                BugIssueExternalProvider::GitHub => route('api.v1.webhooks.github', $integration),
                BugIssueExternalProvider::Jira => route('api.v1.webhooks.jira', $integration),
                default => null,
            },
        ];
    }
}
