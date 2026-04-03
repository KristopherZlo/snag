<?php

namespace App\Services\BugIssues;

use App\Enums\BugIssueExternalProvider;
use App\Models\BugIssue;
use App\Models\BugIssueExternalLink;
use App\Models\OrganizationIntegration;
use App\Models\User;
use App\Services\BugIssues\External\GitHubIssueClient;
use App\Services\BugIssues\External\JiraIssueClient;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class IssueExternalLinkService
{
    public function __construct(
        private readonly BugIssueActivityService $activities,
        private readonly GitHubIssueClient $gitHub,
        private readonly JiraIssueClient $jira,
    ) {
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createOrLink(BugIssue $issue, User $actor, array $attributes): BugIssueExternalLink
    {
        $provider = BugIssueExternalProvider::from($attributes['provider']);
        $isPrimary = (bool) ($attributes['is_primary'] ?? false);

        if ($attributes['action'] === 'create') {
            $integration = $this->integrationFor($issue, $provider);
            $payload = $this->clientFor($provider)->create($integration, $issue);

            $link = $this->persistLink($issue, $actor, $provider, array_merge($payload, [
                'is_primary' => $isPrimary,
                'sync_mode' => 'bidirectional',
            ]));

            $this->activities->record($issue, 'external.created', 'Created an external ticket from Snag.', $actor, [
                'provider' => $provider->value,
                'external_key' => $link->external_key,
            ]);

            return $link;
        }

        if (blank($attributes['external_key']) || blank($attributes['external_url'])) {
            throw ValidationException::withMessages([
                'external_key' => 'External key is required when linking an existing ticket.',
                'external_url' => 'External URL is required when linking an existing ticket.',
            ]);
        }

        $link = $this->persistLink($issue, $actor, $provider, [
            'external_key' => $attributes['external_key'],
            'external_id' => $attributes['external_id'] ?? null,
            'external_url' => $attributes['external_url'],
            'external_snapshot' => null,
            'is_primary' => $isPrimary,
            'sync_mode' => 'linked',
        ]);

        $this->activities->record($issue, 'external.linked', 'Linked an existing external ticket.', $actor, [
            'provider' => $provider->value,
            'external_key' => $link->external_key,
        ]);

        return $link;
    }

    public function sync(BugIssueExternalLink $link, User $actor): BugIssueExternalLink
    {
        $integration = $this->integrationFor($link->issue, $link->provider);
        $payload = $this->clientFor($link->provider)->sync($integration, $link, $link->issue);

        $link->forceFill([
            'external_url' => $payload['external_url'] ?? $link->external_url,
            'external_snapshot' => $payload['external_snapshot'] ?? $link->external_snapshot,
            'last_synced_at' => now(),
            'last_sync_error' => null,
        ])->save();

        $this->activities->record($link->issue, 'external.synced', 'Synced the external ticket from Snag.', $actor, [
            'provider' => $link->provider->value,
            'external_key' => $link->external_key,
        ]);

        return $link->fresh();
    }

    public function revoke(BugIssueExternalLink $link, User $actor): void
    {
        $issue = $link->issue;
        $key = $link->external_key;
        $provider = $link->provider->value;
        $wasPrimary = $link->is_primary;

        $link->delete();

        if ($wasPrimary) {
            $next = $issue->externalLinks()->latest('id')->first();

            if ($next) {
                $next->forceFill(['is_primary' => true])->save();
            }
        }

        $this->activities->record($issue, 'external.revoked', 'Removed an external ticket link.', $actor, [
            'provider' => $provider,
            'external_key' => $key,
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function applyWebhook(OrganizationIntegration $integration, array $payload): ?BugIssueExternalLink
    {
        $provider = $integration->provider;
        $candidateId = (string) data_get($payload, 'issue.id', '');
        $candidateKey = match ($provider) {
            BugIssueExternalProvider::GitHub => '#'.data_get($payload, 'issue.number', ''),
            default => (string) data_get($payload, 'issue.key', ''),
        };

        $link = BugIssueExternalLink::query()
            ->where('organization_id', $integration->organization_id)
            ->where('provider', $provider->value)
            ->where(function ($query) use ($candidateId, $candidateKey) {
                $query
                    ->when($candidateId !== '', fn ($inner) => $inner->orWhere('external_id', $candidateId))
                    ->when($candidateKey !== '', fn ($inner) => $inner->orWhere('external_key', $candidateKey));
            })
            ->with('issue')
            ->first();

        if (!$link) {
            return null;
        }

        $mapped = $this->clientFor($provider)->applyWebhook($link, $payload);

        DB::transaction(function () use ($link, $mapped) {
            $link->forceFill([
                'external_url' => $mapped['external_url'] ?? $link->external_url,
                'external_snapshot' => $mapped['external_snapshot'] ?? $link->external_snapshot,
                'last_synced_at' => now(),
                'last_sync_error' => null,
            ])->save();

            $link->issue->forceFill([
                'workflow_state' => $mapped['workflow_state'] ?? $link->issue->workflow_state->value,
                'resolution' => $mapped['resolution'] ?? $link->issue->resolution->value,
            ])->save();
        });

        return $link->fresh('issue');
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function persistLink(BugIssue $issue, User $actor, BugIssueExternalProvider $provider, array $attributes): BugIssueExternalLink
    {
        return DB::transaction(function () use ($issue, $actor, $provider, $attributes) {
            $isPrimary = (bool) ($attributes['is_primary'] ?? false);

            if ($isPrimary || !$issue->externalLinks()->exists()) {
                $issue->externalLinks()->update(['is_primary' => false]);
            }

            return $issue->externalLinks()->updateOrCreate(
                [
                    'provider' => $provider->value,
                    'external_key' => $attributes['external_key'],
                ],
                [
                    'organization_id' => $issue->organization_id,
                    'created_by_user_id' => $actor->id,
                    'external_id' => $attributes['external_id'] ?? null,
                    'external_url' => $attributes['external_url'],
                    'is_primary' => $isPrimary || !$issue->externalLinks()->where('is_primary', true)->exists(),
                    'sync_mode' => $attributes['sync_mode'] ?? 'linked',
                    'last_synced_at' => now(),
                    'last_sync_error' => null,
                    'external_snapshot' => $attributes['external_snapshot'] ?? null,
                ],
            );
        });
    }

    private function integrationFor(BugIssue $issue, BugIssueExternalProvider $provider): OrganizationIntegration
    {
        $integration = OrganizationIntegration::query()
            ->where('organization_id', $issue->organization_id)
            ->where('provider', $provider->value)
            ->where('is_enabled', true)
            ->first();

        if (!$integration) {
            throw ValidationException::withMessages([
                'provider' => sprintf('Enable %s integration before creating synced tickets.', $provider->value),
            ]);
        }

        return $integration;
    }

    private function clientFor(BugIssueExternalProvider $provider): JiraIssueClient|GitHubIssueClient
    {
        return match ($provider) {
            BugIssueExternalProvider::GitHub => $this->gitHub,
            BugIssueExternalProvider::Jira => $this->jira,
            default => throw ValidationException::withMessages([
                'provider' => 'This provider is not available for sync in the current release.',
            ]),
        };
    }
}
