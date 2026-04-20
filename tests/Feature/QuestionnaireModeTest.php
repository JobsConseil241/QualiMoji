<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Organization;
use App\Models\User;
use App\Models\UserRole;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QuestionnaireModeTest extends TestCase
{
    private function makeUser(Organization $org, string $role, ?string $zoneId = null): User
    {
        $user = User::create([
            'name' => "user-$role",
            'email' => "$role-" . uniqid() . '@example.com',
            'password' => bcrypt('x'),
            'organization_id' => $org->id,
        ]);
        UserRole::create([
            'user_id' => $user->id,
            'role' => $role,
            'zone_id' => $zoneId,
        ]);
        return $user->fresh();
    }

    public function test_get_returns_org_mode_and_branch_overrides(): void
    {
        $org = Organization::create(['name' => 'O', 'questionnaire_mode' => 'quadrimoji']);
        Branch::create(['organization_id' => $org->id, 'name' => 'B1', 'questionnaire_mode' => 'open']);
        Branch::create(['organization_id' => $org->id, 'name' => 'B2', 'questionnaire_mode' => null]);

        Sanctum::actingAs($this->makeUser($org, 'admin'));

        $resp = $this->getJson('/api/settings/questionnaire-mode');

        $resp->assertOk()
            ->assertJsonPath('org_mode', 'quadrimoji')
            ->assertJsonCount(2, 'branches');
    }

    public function test_put_updates_org_mode(): void
    {
        $org = Organization::create(['name' => 'O', 'questionnaire_mode' => 'quadrimoji']);
        Sanctum::actingAs($this->makeUser($org, 'admin'));

        $this->putJson('/api/settings/questionnaire-mode', ['mode' => 'open'])->assertOk();

        $this->assertSame('open', $org->fresh()->questionnaire_mode);
    }

    public function test_put_with_branch_id_sets_branch_override(): void
    {
        $org = Organization::create(['name' => 'O', 'questionnaire_mode' => 'quadrimoji']);
        $branch = Branch::create(['organization_id' => $org->id, 'name' => 'B']);
        Sanctum::actingAs($this->makeUser($org, 'admin'));

        $this->putJson('/api/settings/questionnaire-mode', [
            'mode' => 'open',
            'branch_id' => $branch->id,
        ])->assertOk();

        $this->assertSame('open', $branch->fresh()->questionnaire_mode);
        $this->assertSame('quadrimoji', $org->fresh()->questionnaire_mode);
    }

    public function test_put_rejects_invalid_mode(): void
    {
        $org = Organization::create(['name' => 'O']);
        Sanctum::actingAs($this->makeUser($org, 'admin'));

        $this->putJson('/api/settings/questionnaire-mode', ['mode' => 'bogus'])
            ->assertStatus(422);
    }

    public function test_branch_director_cannot_change_org_mode(): void
    {
        $org = Organization::create(['name' => 'O', 'questionnaire_mode' => 'quadrimoji']);
        $branchDir = $this->makeUser($org, 'branch_director');
        Sanctum::actingAs($branchDir);

        $this->putJson('/api/settings/questionnaire-mode', ['mode' => 'open'])
            ->assertStatus(403);

        $this->assertSame('quadrimoji', $org->fresh()->questionnaire_mode);
    }
}
