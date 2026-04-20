<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\OpenQuestion;
use App\Models\Organization;
use App\Models\QuestionConfig;
use App\Models\User;
use Tests\TestCase;

class KioskConfigModeTest extends TestCase
{
    public function test_returns_quadrimoji_questions_when_branch_in_quadrimoji_mode(): void
    {
        $org = Organization::create(['name' => 'O', 'questionnaire_mode' => 'quadrimoji']);
        $branch = Branch::create([
            'organization_id' => $org->id, 'name' => 'B',
            'is_active' => true, 'questionnaire_mode' => null,
        ]);
        // QuestionConfig requires a user_id — create a dummy user.
        $user = User::create([
            'name' => 'u', 'email' => 'u-' . uniqid() . '@e.com',
            'password' => bcrypt('x'), 'organization_id' => $org->id,
        ]);
        QuestionConfig::create([
            'organization_id' => $org->id, 'branch_id' => null,
            'user_id' => $user->id, 'sentiment' => 'happy',
            'emoji' => 'x', 'label' => 'Happy', 'question' => 'Why?',
            'options' => [], 'is_active' => true, 'sort_order' => 0,
        ]);

        $resp = $this->getJson("/api/kiosk/config/{$branch->id}");

        $resp->assertOk()
            ->assertJsonPath('questionnaire_mode', 'quadrimoji')
            ->assertJsonCount(1, 'question_configs');
    }

    public function test_returns_open_questions_when_branch_in_open_mode(): void
    {
        $org = Organization::create(['name' => 'O', 'questionnaire_mode' => 'open']);
        $branch = Branch::create([
            'organization_id' => $org->id, 'name' => 'B',
            'is_active' => true, 'questionnaire_mode' => null,
        ]);
        OpenQuestion::create([
            'organization_id' => $org->id, 'branch_id' => null,
            'label' => 'Comment?', 'type' => 'long_text',
            'is_active' => true, 'sort_order' => 0,
        ]);

        $resp = $this->getJson("/api/kiosk/config/{$branch->id}");

        $resp->assertOk()
            ->assertJsonPath('questionnaire_mode', 'open')
            ->assertJsonCount(1, 'open_questions');
    }

    public function test_branch_override_wins_over_org(): void
    {
        $org = Organization::create(['name' => 'O', 'questionnaire_mode' => 'quadrimoji']);
        $branch = Branch::create([
            'organization_id' => $org->id, 'name' => 'B',
            'is_active' => true, 'questionnaire_mode' => 'open',
        ]);

        $resp = $this->getJson("/api/kiosk/config/{$branch->id}");

        $resp->assertOk()->assertJsonPath('questionnaire_mode', 'open');
    }

    public function test_feedback_stores_mode_from_branch(): void
    {
        $org = \App\Models\Organization::create(['name' => 'O', 'questionnaire_mode' => 'open']);
        $branch = \App\Models\Branch::create([
            'organization_id' => $org->id, 'name' => 'B',
            'is_active' => true,
        ]);

        $this->postJson('/api/kiosk/feedback', [
            'branch_id' => $branch->id,
            'sentiment' => 'happy',
            'follow_up_responses' => [
                ['question_id' => '00000000-0000-0000-0000-000000000001', 'type' => 'short_text', 'answer' => 'Great'],
            ],
        ])->assertSuccessful();

        $this->assertSame('open', \App\Models\Feedback::first()->questionnaire_mode);
    }
}
