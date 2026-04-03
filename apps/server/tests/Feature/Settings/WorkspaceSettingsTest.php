<?php

namespace Tests\Feature\Settings;

use App\Enums\OrganizationRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\CreatesOrganizations;
use Tests\TestCase;

class WorkspaceSettingsTest extends TestCase
{
    use CreatesOrganizations;
    use RefreshDatabase;

    public function test_members_settings_section_includes_workspace_summary(): void
    {
        $owner = User::factory()->create([
            'name' => 'Owner User',
            'email' => 'owner@example.test',
            'email_verified_at' => now(),
        ]);
        $organization = $this->createOrganizationFor($owner, name: 'Acme QA');

        $this->actingAs($owner)
            ->get(route('settings.members'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Settings/Index')
                ->where('canManageWorkspace', true)
                ->where('workspace.name', 'Acme QA')
                ->where('workspace.slug', $organization->slug)
                ->where('workspace.billing_email', 'owner@example.test')
                ->where('workspace.owner.name', 'Owner User')
                ->where('workspace.member_count', 1));
    }

    public function test_owner_can_update_workspace_settings_from_team_panel(): void
    {
        $owner = User::factory()->create([
            'email' => 'owner@example.test',
            'email_verified_at' => now(),
        ]);
        $organization = $this->createOrganizationFor($owner, name: 'Acme QA');

        $this->actingAs($owner)
            ->patchJson(route('settings.workspace.update'), [
                'name' => 'Platform QA',
                'billing_email' => 'billing@example.test',
            ])
            ->assertOk()
            ->assertJsonPath('workspace.name', 'Platform QA')
            ->assertJsonPath('workspace.slug', $organization->slug)
            ->assertJsonPath('workspace.billing_email', 'billing@example.test');

        $organization->refresh();

        $this->assertSame('Platform QA', $organization->name);
        $this->assertSame('billing@example.test', $organization->billing_email);
    }

    public function test_member_can_view_but_cannot_update_workspace_settings(): void
    {
        $owner = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $organization = $this->createOrganizationFor($owner, name: 'Acme QA');
        $member = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $this->addMembership($organization, $member, OrganizationRole::Member, $owner);
        $member->forceFill([
            'active_organization_id' => $organization->id,
        ])->save();

        $this->actingAs($member)
            ->get(route('settings.members'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Settings/Index')
                ->where('canManageWorkspace', false)
                ->where('workspace.name', 'Acme QA'));

        $this->actingAs($member)
            ->patchJson(route('settings.workspace.update'), [
                'name' => 'Renamed by member',
                'billing_email' => 'billing@example.test',
            ])
            ->assertForbidden();
    }
}
