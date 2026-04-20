<?php

namespace Tests\Feature;

use App\Models\OpenQuestion;
use App\Models\Organization;
use App\Models\User;
use App\Models\UserRole;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OpenQuestionsApiTest extends TestCase
{
    private function admin(Organization $org): User
    {
        $user = User::create([
            'name' => 'A',
            'email' => 'admin-' . uniqid() . '@e.com',
            'password' => bcrypt('x'),
            'organization_id' => $org->id,
        ]);
        UserRole::create(['user_id' => $user->id, 'role' => 'admin']);
        return $user->fresh();
    }

    public function test_get_returns_org_scoped_questions(): void
    {
        $org = Organization::create(['name' => 'O']);
        OpenQuestion::create([
            'organization_id' => $org->id,
            'branch_id' => null,
            'label' => 'How was the service?',
            'type' => 'long_text',
            'is_required' => true,
            'sort_order' => 0,
        ]);
        Sanctum::actingAs($this->admin($org));

        $this->getJson('/api/settings/open-questions')
            ->assertOk()
            ->assertJsonCount(1, 'open_questions')
            ->assertJsonPath('open_questions.0.label', 'How was the service?');
    }

    public function test_post_upserts_questions_in_bulk(): void
    {
        $org = Organization::create(['name' => 'O']);
        Sanctum::actingAs($this->admin($org));

        $payload = [
            'configs' => [
                ['label' => 'Q1', 'type' => 'short_text', 'is_required' => true, 'sort_order' => 0],
                ['label' => 'Q2', 'type' => 'rating_1_5', 'is_required' => false, 'sort_order' => 1],
                ['label' => 'Q3', 'type' => 'single_choice', 'is_required' => false, 'sort_order' => 2,
                 'options' => [['id' => '1', 'label' => 'A'], ['id' => '2', 'label' => 'B']]],
            ],
        ];

        $this->postJson('/api/settings/open-questions', $payload)->assertOk();

        $this->assertSame(3, OpenQuestion::where('organization_id', $org->id)->count());
    }

    public function test_post_rejects_invalid_type(): void
    {
        $org = Organization::create(['name' => 'O']);
        Sanctum::actingAs($this->admin($org));

        $this->postJson('/api/settings/open-questions', [
            'configs' => [['label' => 'Q', 'type' => 'bogus', 'sort_order' => 0]],
        ])->assertStatus(422);
    }

    public function test_post_rejects_more_than_10_questions(): void
    {
        $org = Organization::create(['name' => 'O']);
        Sanctum::actingAs($this->admin($org));

        $configs = [];
        for ($i = 0; $i < 11; $i++) {
            $configs[] = ['label' => "Q$i", 'type' => 'short_text', 'sort_order' => $i];
        }

        $this->postJson('/api/settings/open-questions', ['configs' => $configs])
            ->assertStatus(422);
    }

    public function test_post_replaces_existing_questions_for_scope(): void
    {
        $org = Organization::create(['name' => 'O']);
        OpenQuestion::create(['organization_id' => $org->id, 'label' => 'Old', 'type' => 'short_text', 'sort_order' => 0]);
        Sanctum::actingAs($this->admin($org));

        $this->postJson('/api/settings/open-questions', [
            'configs' => [['label' => 'New', 'type' => 'short_text', 'sort_order' => 0]],
        ])->assertOk();

        $this->assertSame(1, OpenQuestion::where('organization_id', $org->id)->count());
        $this->assertSame('New', OpenQuestion::where('organization_id', $org->id)->first()->label);
    }
}
