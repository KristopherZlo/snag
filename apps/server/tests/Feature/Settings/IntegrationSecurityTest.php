<?php

namespace Tests\Feature\Settings;

use App\Enums\BugIssueExternalProvider;
use App\Enums\OrganizationRole;
use App\Models\Organization;
use App\Models\OrganizationIntegration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class IntegrationSecurityTest extends TestCase
{
    use CreatesOrganizations;
    use RefreshDatabase;

    public function test_member_cannot_open_integrations_settings_or_store_integration_settings(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganizationFor($owner);
        $member = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $this->addMembership($organization, $member, OrganizationRole::Member, $owner);
        $member->forceFill([
            'active_organization_id' => $organization->id,
        ])->save();

        $this->actingAs($member)
            ->get(route('settings.integrations'))
            ->assertForbidden();

        Sanctum::actingAs($member, ['integrations:manage']);

        $this->postJson(route('api.v1.integrations.store'), [
            'provider' => BugIssueExternalProvider::GitHub->value,
            'is_enabled' => true,
            'config' => [
                'repository' => 'acme/app',
                'token' => 'token-1234',
            ],
        ])->assertForbidden();
    }

    public function test_admin_sees_only_masked_integration_secrets_on_settings_page(): void
    {
        $owner = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $organization = $this->createOrganizationFor($owner);

        OrganizationIntegration::query()->create([
            'organization_id' => $organization->id,
            'provider' => BugIssueExternalProvider::Jira->value,
            'is_enabled' => true,
            'webhook_secret' => 'secret-1234',
            'config' => [
                'base_url' => 'https://company.atlassian.net',
                'email' => 'qa@example.com',
                'api_token' => 'jira-token-1234',
                'project_key' => 'BUG',
            ],
        ]);

        $this->actingAs($owner)
            ->get(route('settings.integrations'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Settings/Index')
                ->where('section', 'integrations')
                ->where('integrations.0.provider', 'jira')
                ->where('integrations.0.config.base_url', 'https://company.atlassian.net')
                ->where('integrations.0.config.project_key', 'BUG')
                ->where('integrations.0.config.email', '**********.com')
                ->where('integrations.0.config.api_token', '***********1234')
                ->where('integrations.0.has_webhook_secret', true)
                ->where('integrations.0.webhook_secret_masked', '********1234'));
    }

    public function test_admin_store_response_masks_secrets_and_preserves_existing_sensitive_values(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganizationFor($owner);
        $integration = $this->createGitHubIntegration($organization, 'token-1234', 'secret-9999');

        Sanctum::actingAs($owner, ['integrations:manage']);

        $response = $this->postJson(route('api.v1.integrations.store'), [
            'provider' => BugIssueExternalProvider::GitHub->value,
            'is_enabled' => true,
            'config' => [
                'repository' => 'acme/secure-repo',
                'token' => '********1234',
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('integration.config.repository', 'acme/secure-repo')
            ->assertJsonPath('integration.config.token', '********1234')
            ->assertJsonPath('integration.webhook_secret_masked', '********9999');

        $this->assertStringNotContainsString('token-1234', $response->getContent());
        $this->assertStringNotContainsString('secret-9999', $response->getContent());

        $integration->refresh();

        $this->assertSame('acme/secure-repo', $integration->config['repository']);
        $this->assertSame('token-1234', $integration->config['token']);
        $this->assertSame('secret-9999', $integration->webhook_secret);
        $this->assertNull(DB::table('organization_integrations')->where('id', $integration->id)->value('webhook_secret'));
        $this->assertNotNull(DB::table('organization_integrations')->where('id', $integration->id)->value('webhook_secret_encrypted'));
    }

    public function test_admin_can_rotate_webhook_secret_and_only_see_the_new_value_once(): void
    {
        $owner = User::factory()->create();
        $organization = $this->createOrganizationFor($owner);
        $integration = $this->createGitHubIntegration($organization, 'token-1234', 'secret-9999');

        Sanctum::actingAs($owner, ['integrations:manage']);

        $response = $this->postJson(route('api.v1.integrations.store'), [
            'provider' => BugIssueExternalProvider::GitHub->value,
            'is_enabled' => true,
            'rotate_webhook_secret' => true,
            'config' => [
                'repository' => 'acme/original-repo',
                'token' => '********1234',
            ],
        ]);

        $revealedSecret = $response->json('integration.one_time_secrets.webhook_secret');

        $response->assertOk()
            ->assertJsonPath('integration.config.token', '********1234')
            ->assertJsonPath('integration.one_time_secrets.webhook_secret', fn (?string $value) => is_string($value) && strlen($value) === 40);

        $this->assertNotSame('secret-9999', $revealedSecret);

        $integration->refresh();

        $this->assertSame($revealedSecret, $integration->webhook_secret);
        $this->assertNull(DB::table('organization_integrations')->where('id', $integration->id)->value('webhook_secret'));
        $this->assertNotNull(DB::table('organization_integrations')->where('id', $integration->id)->value('webhook_secret_encrypted'));
    }

    private function createGitHubIntegration(
        Organization $organization,
        string $token,
        string $webhookSecret,
    ): OrganizationIntegration {
        return OrganizationIntegration::query()->create([
            'organization_id' => $organization->id,
            'provider' => BugIssueExternalProvider::GitHub->value,
            'is_enabled' => true,
            'webhook_secret' => $webhookSecret,
            'config' => [
                'repository' => 'acme/original-repo',
                'token' => $token,
            ],
        ]);
    }
}
