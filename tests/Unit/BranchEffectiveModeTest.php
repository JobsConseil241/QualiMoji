<?php

namespace Tests\Unit;

use App\Models\Branch;
use App\Models\Organization;
use Tests\TestCase;

class BranchEffectiveModeTest extends TestCase
{
    public function test_returns_branch_mode_when_set(): void
    {
        $org = Organization::create(['name' => 'O', 'questionnaire_mode' => 'quadrimoji']);
        $branch = Branch::create([
            'organization_id' => $org->id,
            'name' => 'B',
            'questionnaire_mode' => 'open',
        ]);

        $this->assertSame('open', $branch->effectiveQuestionnaireMode());
    }

    public function test_falls_back_to_org_mode_when_branch_mode_null(): void
    {
        $org = Organization::create(['name' => 'O', 'questionnaire_mode' => 'open']);
        $branch = Branch::create([
            'organization_id' => $org->id,
            'name' => 'B',
            'questionnaire_mode' => null,
        ]);

        $this->assertSame('open', $branch->fresh()->effectiveQuestionnaireMode());
    }

    public function test_defaults_to_quadrimoji_when_org_has_no_mode(): void
    {
        $branch = new Branch(['name' => 'Orphan']);

        $this->assertSame('quadrimoji', $branch->effectiveQuestionnaireMode());
    }
}
