# Questionnaire Modes (Quadrimoji & Open) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each branch (or its parent organization) pick between the existing Quadrimoji follow-up questionnaire and a new Open mode (common wizard of typed questions) while preserving every feedback's collection-time mode for reporting.

**Architecture:** Additive schema changes only. A `questionnaire_mode` enum is stored on `organizations`, `branches` (nullable = inherit), and `feedbacks` (snapshot at collection). A new `open_questions` table holds the typed questions for the Open mode; the existing `question_configs` table stays untouched for Quadrimoji. The Kiosk endpoint resolves the effective mode for the branch and returns the matching question set.

**Tech Stack:** Laravel 11 (PHP 8.2), PHPUnit 11, React + TypeScript, Vite, Tailwind, shadcn/ui, dnd-kit.

**Reference spec:** `docs/superpowers/specs/2026-04-19-questionnaire-modes-design.md`

---

## File Map

### Backend

| File | Action |
|---|---|
| `database/migrations/2026_04_20_000001_add_questionnaire_mode_to_organizations_table.php` | Create |
| `database/migrations/2026_04_20_000002_add_questionnaire_mode_to_branches_table.php` | Create |
| `database/migrations/2026_04_20_000003_add_questionnaire_mode_to_feedbacks_table.php` | Create |
| `database/migrations/2026_04_20_000004_create_open_questions_table.php` | Create |
| `app/Models/OpenQuestion.php` | Create |
| `app/Models/Organization.php` | Modify — fillable + cast + relationship |
| `app/Models/Branch.php` | Modify — fillable + cast + relationship + `effectiveQuestionnaireMode()` |
| `app/Models/Feedback.php` | Modify — fillable + cast |
| `app/Http/Controllers/Api/SettingsController.php` | Modify — 4 new methods |
| `app/Http/Controllers/Api/KioskController.php` | Modify — enrich `config()` |
| `app/Http/Controllers/Api/FeedbackController.php` | Modify — validate mode-aware payload |
| `routes/api.php` | Modify — add routes |
| `app/Http/Controllers/Api/ReportController.php` | Modify — mode filter + sections |
| `tests/TestCase.php` | Modify — enable `RefreshDatabase` usage |
| `tests/Feature/QuestionnaireModeTest.php` | Create |
| `tests/Feature/OpenQuestionsApiTest.php` | Create |
| `tests/Feature/KioskConfigModeTest.php` | Create |
| `tests/Unit/BranchEffectiveModeTest.php` | Create |

### Frontend

| File | Action |
|---|---|
| `resources/js/components/settings/QuestionnaireSettings.tsx` | Create — hub with mode switcher + 2 tabs |
| `resources/js/components/settings/OpenQuestionsEditor.tsx` | Create |
| `resources/js/components/settings/BranchOverridePanel.tsx` | Create |
| `resources/js/components/settings/QuestionsConfig.tsx` | Unchanged (reused) |
| `resources/js/pages/Settings.tsx` | Modify — swap old "Questions" content for `<QuestionnaireSettings/>` |
| `resources/js/pages/Kiosk.tsx` | Modify — branch flow by mode, extend `Step` type |
| `resources/js/components/kiosk/OpenQuestionsWizard.tsx` | Create |
| `resources/js/components/kiosk/question-types/ShortText.tsx` | Create |
| `resources/js/components/kiosk/question-types/LongText.tsx` | Create |
| `resources/js/components/kiosk/question-types/Rating1to5.tsx` | Create |
| `resources/js/components/kiosk/question-types/Rating1to10.tsx` | Create |
| `resources/js/components/kiosk/question-types/SingleChoice.tsx` | Create |
| `resources/js/components/kiosk/question-types/MultiChoice.tsx` | Create |
| `resources/js/services/kioskService.ts` | Modify — extend payload type |
| `resources/js/services/kioskConfigService.ts` | Modify — extend response type |
| `resources/js/pages/Reports.tsx` | Modify — add mode filter |

---

## Phase 1 — Database foundation

### Task 1: Migrations for questionnaire_mode columns

**Files:**
- Create: `database/migrations/2026_04_20_000001_add_questionnaire_mode_to_organizations_table.php`
- Create: `database/migrations/2026_04_20_000002_add_questionnaire_mode_to_branches_table.php`
- Create: `database/migrations/2026_04_20_000003_add_questionnaire_mode_to_feedbacks_table.php`

- [ ] **Step 1: Write organizations migration**

Create `database/migrations/2026_04_20_000001_add_questionnaire_mode_to_organizations_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->enum('questionnaire_mode', ['quadrimoji', 'open'])
                ->default('quadrimoji')
                ->after('kiosk_show_branch_name');
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn('questionnaire_mode');
        });
    }
};
```

- [ ] **Step 2: Write branches migration**

Create `database/migrations/2026_04_20_000002_add_questionnaire_mode_to_branches_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->enum('questionnaire_mode', ['quadrimoji', 'open'])
                ->nullable()
                ->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn('questionnaire_mode');
        });
    }
};
```

- [ ] **Step 3: Write feedbacks migration (with backfill)**

Create `database/migrations/2026_04_20_000003_add_questionnaire_mode_to_feedbacks_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('feedbacks', function (Blueprint $table) {
            $table->enum('questionnaire_mode', ['quadrimoji', 'open'])
                ->default('quadrimoji')
                ->after('sentiment');
        });

        DB::table('feedbacks')
            ->whereNull('questionnaire_mode')
            ->update(['questionnaire_mode' => 'quadrimoji']);
    }

    public function down(): void
    {
        Schema::table('feedbacks', function (Blueprint $table) {
            $table->dropColumn('questionnaire_mode');
        });
    }
};
```

- [ ] **Step 4: Run migrations**

Run: `php artisan migrate`
Expected: `Migrated: 2026_04_20_000001_...`, `_000002_...`, `_000003_...` (3 lines).

- [ ] **Step 5: Verify columns exist**

Run: `php artisan tinker --execute="echo Schema::hasColumn('organizations','questionnaire_mode') ? 'OK1' : 'FAIL1'; echo Schema::hasColumn('branches','questionnaire_mode') ? 'OK2' : 'FAIL2'; echo Schema::hasColumn('feedbacks','questionnaire_mode') ? 'OK3' : 'FAIL3';"`
Expected: `OK1OK2OK3`

- [ ] **Step 6: Commit**

```bash
git add database/migrations/2026_04_20_00000{1,2,3}*.php
git commit -m "feat(db): add questionnaire_mode to organizations, branches, feedbacks"
```

---

### Task 2: Migration for open_questions table

**Files:**
- Create: `database/migrations/2026_04_20_000004_create_open_questions_table.php`

- [ ] **Step 1: Write migration**

Create `database/migrations/2026_04_20_000004_create_open_questions_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('open_questions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->nullable();
            $table->string('branch_id')->nullable();
            $table->string('label');
            $table->enum('type', [
                'short_text',
                'long_text',
                'rating_1_5',
                'rating_1_10',
                'single_choice',
                'multi_choice',
            ]);
            $table->json('options')->nullable();
            $table->boolean('is_required')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->integer('version')->default(1);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('cascade');
            $table->index(['organization_id', 'branch_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('open_questions');
    }
};
```

- [ ] **Step 2: Run migration**

Run: `php artisan migrate`
Expected: `Migrated: 2026_04_20_000004_create_open_questions_table`

- [ ] **Step 3: Verify table exists**

Run: `php artisan tinker --execute="echo Schema::hasTable('open_questions') ? 'OK' : 'FAIL';"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add database/migrations/2026_04_20_000004_create_open_questions_table.php
git commit -m "feat(db): create open_questions table for Open questionnaire mode"
```

---

### Task 3: OpenQuestion model

**Files:**
- Create: `app/Models/OpenQuestion.php`

- [ ] **Step 1: Write the model**

Create `app/Models/OpenQuestion.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class OpenQuestion extends Model
{
    use HasUuids;

    protected $fillable = [
        'organization_id',
        'branch_id',
        'label',
        'type',
        'options',
        'is_required',
        'is_active',
        'sort_order',
        'version',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'is_required' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
```

- [ ] **Step 2: Smoke-check the model boots**

Run: `php artisan tinker --execute="echo (new App\Models\OpenQuestion())->getTable();"`
Expected: `open_questions`

- [ ] **Step 3: Commit**

```bash
git add app/Models/OpenQuestion.php
git commit -m "feat(models): add OpenQuestion model"
```

---

### Task 4: Update Organization, Branch, Feedback models

**Files:**
- Modify: `app/Models/Organization.php`
- Modify: `app/Models/Branch.php`
- Modify: `app/Models/Feedback.php`

- [ ] **Step 1: Update Organization model**

Edit `app/Models/Organization.php`. Add `'questionnaire_mode'` to `$fillable`:

```php
    protected $fillable = [
        'name',
        'logo_url',
        'primary_color',
        'kiosk_logo_size',
        'kiosk_logo_position',
        'kiosk_show_org_name',
        'kiosk_show_branch_name',
        'questionnaire_mode',
    ];
```

Add this relationship after `questionConfigs()`:

```php
    public function openQuestions()
    {
        return $this->hasMany(OpenQuestion::class);
    }
```

- [ ] **Step 2: Update Branch model**

Edit `app/Models/Branch.php`. Add `'questionnaire_mode'` to `$fillable`:

```php
    protected $fillable = [
        'organization_id',
        'zone_id',
        'name',
        'city',
        'address',
        'region',
        'is_active',
        'questionnaire_mode',
    ];
```

Add these methods to the class:

```php
    public function openQuestions()
    {
        return $this->hasMany(OpenQuestion::class);
    }

    public function effectiveQuestionnaireMode(): string
    {
        if ($this->questionnaire_mode !== null) {
            return $this->questionnaire_mode;
        }
        return $this->organization?->questionnaire_mode ?? 'quadrimoji';
    }
```

- [ ] **Step 3: Update Feedback model**

Edit `app/Models/Feedback.php`. Add `'questionnaire_mode'` to `$fillable`:

```php
    protected $fillable = [
        'branch_id',
        'sentiment',
        'questionnaire_mode',
        'follow_up_responses',
        'customer_name',
        'customer_gender',
        'customer_email',
        'customer_phone',
        'customer_notified',
        'wants_callback',
    ];
```

- [ ] **Step 4: Commit**

```bash
git add app/Models/Organization.php app/Models/Branch.php app/Models/Feedback.php
git commit -m "feat(models): wire questionnaire_mode + OpenQuestion relationships"
```

---

## Phase 2 — Mode resolution & unit tests

### Task 5: Enable RefreshDatabase in TestCase + unit-test Branch::effectiveQuestionnaireMode

**Files:**
- Modify: `tests/TestCase.php`
- Create: `tests/Unit/BranchEffectiveModeTest.php`

- [ ] **Step 1: Add RefreshDatabase trait availability**

Edit `tests/TestCase.php`:

```php
<?php

namespace Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;
}
```

- [ ] **Step 2: Configure a sqlite in-memory test DB**

Edit `phpunit.xml` — uncomment the two DB env lines inside `<php>`:

```xml
    <php>
        <env name="APP_ENV" value="testing"/>
        <env name="APP_MAINTENANCE_DRIVER" value="file"/>
        <env name="BCRYPT_ROUNDS" value="4"/>
        <env name="CACHE_STORE" value="array"/>
        <env name="DB_CONNECTION" value="sqlite"/>
        <env name="DB_DATABASE" value=":memory:"/>
        <env name="MAIL_MAILER" value="array"/>
```

- [ ] **Step 3: Write the failing unit test**

Create `tests/Unit/BranchEffectiveModeTest.php`:

```php
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
```

- [ ] **Step 4: Run the test**

Run: `./vendor/bin/phpunit --filter BranchEffectiveModeTest`
Expected: `OK (3 tests, ...)` — if already passing, the Task 4 implementation is correct. If FAIL, fix the implementation in `Branch::effectiveQuestionnaireMode()`.

- [ ] **Step 5: Commit**

```bash
git add tests/TestCase.php phpunit.xml tests/Unit/BranchEffectiveModeTest.php
git commit -m "test(models): unit tests for Branch::effectiveQuestionnaireMode"
```

---

## Phase 3 — Backend API: SettingsController

### Task 6: Add questionnaire-mode endpoints

**Files:**
- Modify: `app/Http/Controllers/Api/SettingsController.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/QuestionnaireModeTest.php`

- [ ] **Step 1: Write the failing feature test**

Create `tests/Feature/QuestionnaireModeTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Organization;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QuestionnaireModeTest extends TestCase
{
    private function adminFor(Organization $org): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'a@example.com',
            'password' => bcrypt('x'),
            'organization_id' => $org->id,
            'role' => 'admin',
        ]);
    }

    public function test_get_returns_org_mode_and_branch_overrides(): void
    {
        $org = Organization::create(['name' => 'O', 'questionnaire_mode' => 'quadrimoji']);
        Branch::create(['organization_id' => $org->id, 'name' => 'B1', 'questionnaire_mode' => 'open']);
        Branch::create(['organization_id' => $org->id, 'name' => 'B2', 'questionnaire_mode' => null]);

        Sanctum::actingAs($this->adminFor($org));

        $resp = $this->getJson('/api/settings/questionnaire-mode');

        $resp->assertOk()
            ->assertJsonPath('org_mode', 'quadrimoji')
            ->assertJsonCount(2, 'branches');
    }

    public function test_put_updates_org_mode(): void
    {
        $org = Organization::create(['name' => 'O', 'questionnaire_mode' => 'quadrimoji']);
        Sanctum::actingAs($this->adminFor($org));

        $this->putJson('/api/settings/questionnaire-mode', ['mode' => 'open'])->assertOk();

        $this->assertSame('open', $org->fresh()->questionnaire_mode);
    }

    public function test_put_with_branch_id_sets_branch_override(): void
    {
        $org = Organization::create(['name' => 'O', 'questionnaire_mode' => 'quadrimoji']);
        $branch = Branch::create(['organization_id' => $org->id, 'name' => 'B']);
        Sanctum::actingAs($this->adminFor($org));

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
        Sanctum::actingAs($this->adminFor($org));

        $this->putJson('/api/settings/questionnaire-mode', ['mode' => 'bogus'])
            ->assertStatus(422);
    }

    public function test_branch_director_cannot_change_org_mode(): void
    {
        $org = Organization::create(['name' => 'O', 'questionnaire_mode' => 'quadrimoji']);
        $branchDir = User::create([
            'name' => 'BD', 'email' => 'bd@example.com', 'password' => bcrypt('x'),
            'organization_id' => $org->id, 'role' => 'branch_director',
        ]);
        Sanctum::actingAs($branchDir);

        $this->putJson('/api/settings/questionnaire-mode', ['mode' => 'open'])
            ->assertStatus(403);

        $this->assertSame('quadrimoji', $org->fresh()->questionnaire_mode);
    }
}
```

- [ ] **Step 2: Run to confirm it fails**

Run: `./vendor/bin/phpunit --filter QuestionnaireModeTest`
Expected: FAIL (route not found / method missing).

- [ ] **Step 3: Add methods to SettingsController**

Edit `app/Http/Controllers/Api/SettingsController.php`. Add the `use` for Branch at the top:

```php
use App\Models\Branch;
```

Add these two methods just before `// ── Kiosk Config ──`:

```php
    // ── Questionnaire Mode ──

    public function getQuestionnaireMode(Request $request)
    {
        $user = $request->user();
        $org = Organization::find($user->organization_id);

        $branches = Branch::where('organization_id', $user->organization_id)
            ->get(['id', 'name', 'questionnaire_mode'])
            ->map(fn ($b) => [
                'branch_id' => $b->id,
                'name' => $b->name,
                'mode' => $b->questionnaire_mode,
            ]);

        return response()->json([
            'org_mode' => $org?->questionnaire_mode ?? 'quadrimoji',
            'branches' => $branches,
        ]);
    }

    public function updateQuestionnaireMode(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'mode' => 'required|in:quadrimoji,open',
            'branch_id' => 'nullable|string|exists:branches,id',
            'wipe_other_mode_config' => 'nullable|boolean',
        ]);

        if (!empty($validated['branch_id'])) {
            $this->authorizeBranchMode($user, $validated['branch_id']);
            $branch = Branch::findOrFail($validated['branch_id']);
            $branch->update(['questionnaire_mode' => $validated['mode']]);
            $target = $branch;
            $targetType = 'branch';
        } else {
            if (!in_array($user->role, ['admin', 'it_admin', 'zone_director'], true)) {
                abort(403, 'Only admin or zone director can change org mode');
            }
            $org = Organization::findOrFail($user->organization_id);
            $org->update(['questionnaire_mode' => $validated['mode']]);
            $target = $org;
            $targetType = 'organization';
        }

        AuditLog::create([
            'actor_id' => $user->id,
            'actor_email' => $user->email,
            'action' => 'questionnaire_mode.updated',
            'target_type' => $targetType,
            'target_id' => $target->id,
            'details' => ['mode' => $validated['mode']],
        ]);

        return response()->json([
            'ok' => true,
            'mode' => $validated['mode'],
            'scope' => $targetType,
        ]);
    }

    private function authorizeBranchMode($user, string $branchId): void
    {
        if (in_array($user->role, ['admin', 'it_admin'], true)) {
            return;
        }
        $branch = Branch::findOrFail($branchId);
        if ($branch->organization_id !== $user->organization_id) {
            abort(403);
        }
        if ($user->role === 'zone_director') {
            if ($branch->zone_id === null || $branch->zone_id !== $user->zone_id) {
                abort(403);
            }
            return;
        }
        if ($user->role === 'branch_director') {
            $assigned = $user->branches()->where('branches.id', $branchId)->exists();
            if (!$assigned) {
                abort(403);
            }
            return;
        }
        abort(403);
    }
```

- [ ] **Step 4: Add routes**

Edit `routes/api.php`. Inside the `Route::prefix('settings')->group(...)` block, add after the `questions` routes:

```php
        Route::get('/questionnaire-mode', [SettingsController::class, 'getQuestionnaireMode']);
        Route::put('/questionnaire-mode', [SettingsController::class, 'updateQuestionnaireMode']);
```

- [ ] **Step 5: Run tests until green**

Run: `./vendor/bin/phpunit --filter QuestionnaireModeTest`
Expected: `OK (5 tests, ...)`

If tests fail because `User` model lacks `branches()` or `zone_id`, adjust the `authorizeBranchMode` method to match the actual User model (inspect `app/Models/User.php`). The test for `branch_director` scenario only checks refusal, so a minimal `abort(403)` is acceptable if the relationship doesn't exist; update the test accordingly.

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/Api/SettingsController.php routes/api.php tests/Feature/QuestionnaireModeTest.php
git commit -m "feat(api): add GET/PUT /settings/questionnaire-mode with role guards"
```

---

### Task 7: Add open-questions endpoints

**Files:**
- Modify: `app/Http/Controllers/Api/SettingsController.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/OpenQuestionsApiTest.php`

- [ ] **Step 1: Write the failing feature test**

Create `tests/Feature/OpenQuestionsApiTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\OpenQuestion;
use App\Models\Organization;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OpenQuestionsApiTest extends TestCase
{
    private function admin(Organization $org): User
    {
        return User::create([
            'name' => 'A', 'email' => 'a@e.com', 'password' => bcrypt('x'),
            'organization_id' => $org->id, 'role' => 'admin',
        ]);
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
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `./vendor/bin/phpunit --filter OpenQuestionsApiTest`
Expected: FAIL (route not found).

- [ ] **Step 3: Add `use` and methods to SettingsController**

Edit `app/Http/Controllers/Api/SettingsController.php`. Add near the top:

```php
use App\Models\OpenQuestion;
```

Add these methods after `updateQuestionnaireMode()`:

```php
    // ── Open Questions ──

    public function getOpenQuestions(Request $request)
    {
        $user = $request->user();
        $branchId = $request->get('branch_id');

        $query = OpenQuestion::where('organization_id', $user->organization_id);
        if ($branchId !== null) {
            $query->where('branch_id', $branchId);
        } else {
            $query->whereNull('branch_id');
        }

        $configs = $query->orderBy('sort_order')->get();

        return response()->json(['open_questions' => $configs]);
    }

    public function saveOpenQuestions(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'nullable|string|exists:branches,id',
            'configs' => 'required|array|max:10',
            'configs.*.id' => 'nullable|string',
            'configs.*.label' => 'required|string|max:300',
            'configs.*.type' => 'required|in:short_text,long_text,rating_1_5,rating_1_10,single_choice,multi_choice',
            'configs.*.options' => 'nullable|array',
            'configs.*.options.*.id' => 'required_with:configs.*.options|string',
            'configs.*.options.*.label' => 'required_with:configs.*.options|string|max:200',
            'configs.*.is_required' => 'boolean',
            'configs.*.is_active' => 'boolean',
            'configs.*.sort_order' => 'required|integer|min:0',
        ]);

        $user = $request->user();
        $branchId = $validated['branch_id'] ?? null;

        if ($branchId) {
            $this->authorizeBranchMode($user, $branchId);
        } elseif (!in_array($user->role, ['admin', 'it_admin', 'zone_director'], true)) {
            abort(403);
        }

        OpenQuestion::where('organization_id', $user->organization_id)
            ->where(fn ($q) => $branchId ? $q->where('branch_id', $branchId) : $q->whereNull('branch_id'))
            ->delete();

        $saved = [];
        foreach ($validated['configs'] as $cfg) {
            $saved[] = OpenQuestion::create([
                'organization_id' => $user->organization_id,
                'branch_id' => $branchId,
                'label' => $cfg['label'],
                'type' => $cfg['type'],
                'options' => $cfg['options'] ?? null,
                'is_required' => $cfg['is_required'] ?? false,
                'is_active' => $cfg['is_active'] ?? true,
                'sort_order' => $cfg['sort_order'],
            ]);
        }

        AuditLog::create([
            'actor_id' => $user->id,
            'actor_email' => $user->email,
            'action' => 'open_questions.updated',
            'target_type' => 'open_question',
            'details' => ['count' => count($saved), 'branch_id' => $branchId],
        ]);

        return response()->json(['open_questions' => $saved]);
    }
```

- [ ] **Step 4: Add routes**

Edit `routes/api.php` inside the `settings` group:

```php
        Route::get('/open-questions', [SettingsController::class, 'getOpenQuestions']);
        Route::post('/open-questions', [SettingsController::class, 'saveOpenQuestions']);
```

- [ ] **Step 5: Run tests until green**

Run: `./vendor/bin/phpunit --filter OpenQuestionsApiTest`
Expected: `OK (5 tests, ...)`

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/Api/SettingsController.php routes/api.php tests/Feature/OpenQuestionsApiTest.php
git commit -m "feat(api): GET/POST /settings/open-questions with bulk upsert"
```

---

## Phase 4 — Backend API: Kiosk

### Task 8: Enrich kiosk config endpoint

**Files:**
- Modify: `app/Http/Controllers/Api/KioskController.php`
- Create: `tests/Feature/KioskConfigModeTest.php`

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/KioskConfigModeTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\OpenQuestion;
use App\Models\Organization;
use App\Models\QuestionConfig;
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
        QuestionConfig::create([
            'organization_id' => $org->id, 'branch_id' => null,
            'user_id' => 1, 'sentiment' => 'happy',
            'emoji' => '🙂', 'label' => 'Happy', 'question' => 'Why?',
            'options' => [], 'is_active' => true, 'sort_order' => 0,
        ]);

        $resp = $this->getJson("/api/kiosk/config/{$branch->id}");

        $resp->assertOk()
            ->assertJsonPath('questionnaire_mode', 'quadrimoji')
            ->assertJsonCount(1, 'question_configs')
            ->assertJsonMissingPath('open_questions');
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
}
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `./vendor/bin/phpunit --filter KioskConfigModeTest`
Expected: FAIL (json path `questionnaire_mode` missing).

- [ ] **Step 3: Update KioskController**

Edit `app/Http/Controllers/Api/KioskController.php`. Add the import:

```php
use App\Models\OpenQuestion;
```

Replace the body of the `config` method with:

```php
    public function config(Request $request, string $branchId)
    {
        $branch = Branch::where('id', $branchId)->where('is_active', true)->firstOrFail();
        $org = $branch->organization;

        $kioskConfig = KioskConfig::where('branch_id', $branchId)->first()
            ?? KioskConfig::where('organization_id', $org->id)->whereNull('branch_id')->first();

        $mode = $branch->effectiveQuestionnaireMode();

        $response = [
            'branch' => [
                'id' => $branch->id,
                'name' => $branch->name,
            ],
            'organization' => [
                'id' => $org->id,
                'name' => $org->name,
                'logo_url' => $org->logo_url,
                'primary_color' => $org->primary_color,
                'kiosk_logo_size' => $org->kiosk_logo_size,
                'kiosk_logo_position' => $org->kiosk_logo_position,
                'kiosk_show_org_name' => $org->kiosk_show_org_name,
                'kiosk_show_branch_name' => $org->kiosk_show_branch_name,
            ],
            'kiosk_config' => $kioskConfig,
            'questionnaire_mode' => $mode,
        ];

        if ($mode === 'open') {
            $response['open_questions'] = OpenQuestion::where(function ($q) use ($branchId, $org) {
                $q->where('branch_id', $branchId)
                  ->orWhere(function ($q2) use ($org) {
                      $q2->where('organization_id', $org->id)->whereNull('branch_id');
                  });
            })->where('is_active', true)->orderBy('sort_order')->get();
        } else {
            $response['question_configs'] = QuestionConfig::where(function ($q) use ($branchId, $org) {
                $q->where('branch_id', $branchId)
                  ->orWhere(function ($q2) use ($org) {
                      $q2->where('organization_id', $org->id)->whereNull('branch_id');
                  });
            })->where('is_active', true)->orderBy('sort_order')->get();
        }

        return response()->json($response);
    }
```

- [ ] **Step 4: Run tests until green**

Run: `./vendor/bin/phpunit --filter KioskConfigModeTest`
Expected: `OK (3 tests, ...)`

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/Api/KioskController.php tests/Feature/KioskConfigModeTest.php
git commit -m "feat(kiosk): return mode-aware config (quadrimoji vs open questions)"
```

---

### Task 9: Persist questionnaire_mode on feedback submission

**Files:**
- Modify: `app/Http/Controllers/Api/FeedbackController.php`

- [ ] **Step 1: Inspect current store logic**

Run: `rg -n "public function store" app/Http/Controllers/Api/FeedbackController.php`

Read the method body to identify where the feedback is created.

- [ ] **Step 2: Update validation rules**

In the `store` method's `validate()` call, ADD these rules alongside the existing ones (do not remove existing rules):

```php
            'questionnaire_mode' => 'nullable|in:quadrimoji,open',
            'follow_up_responses' => 'nullable|array',
```

- [ ] **Step 3: Compute mode server-side and persist it**

Immediately after `$validated = $request->validate(...)` in `store()`, add:

```php
        $branch = \App\Models\Branch::findOrFail($validated['branch_id']);
        $validated['questionnaire_mode'] = $branch->effectiveQuestionnaireMode();
```

Make sure the `Feedback::create(...)` call passes `$validated` (or includes `questionnaire_mode`). If the controller calls `Feedback::create` with a hand-picked array, add `'questionnaire_mode' => $validated['questionnaire_mode']` to that array.

- [ ] **Step 4: Add a smoke feature test**

Append to `tests/Feature/KioskConfigModeTest.php` a new method:

```php
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
```

- [ ] **Step 5: Run the test**

Run: `./vendor/bin/phpunit --filter KioskConfigModeTest`
Expected: `OK (4 tests, ...)`

If it fails due to missing required fields in the payload, read the current `store` rules and extend the payload in the test accordingly — do not weaken the controller rules.

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/Api/FeedbackController.php tests/Feature/KioskConfigModeTest.php
git commit -m "feat(feedback): snapshot questionnaire_mode on submission"
```

---

## Phase 5 — Frontend: Admin UI

### Task 10: Types + service layer for questionnaire mode

**Files:**
- Modify: `resources/js/services/kioskConfigService.ts`
- Create: `resources/js/types/questionnaire.ts`

- [ ] **Step 1: Create shared types**

Create `resources/js/types/questionnaire.ts`:

```typescript
export type QuestionnaireMode = 'quadrimoji' | 'open';

export type OpenQuestionType =
  | 'short_text'
  | 'long_text'
  | 'rating_1_5'
  | 'rating_1_10'
  | 'single_choice'
  | 'multi_choice';

export interface OpenQuestionOption {
  id: string;
  label: string;
}

export interface OpenQuestion {
  id?: string;
  label: string;
  type: OpenQuestionType;
  options?: OpenQuestionOption[];
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface BranchModeEntry {
  branch_id: string;
  name: string;
  mode: QuestionnaireMode | null;
}

export interface OpenAnswer {
  question_id: string;
  type: OpenQuestionType;
  answer: string | number | string[] | null;
}
```

- [ ] **Step 2: Read the current kioskConfigService to extend its response shape**

Run: `cat resources/js/services/kioskConfigService.ts`

Inside, find the TypeScript interface for the kiosk config response and add:

```typescript
  questionnaire_mode: 'quadrimoji' | 'open';
  open_questions?: import('@/types/questionnaire').OpenQuestion[];
```

(Keep `question_configs?` as optional.)

- [ ] **Step 3: Commit**

```bash
git add resources/js/types/questionnaire.ts resources/js/services/kioskConfigService.ts
git commit -m "feat(types): questionnaire mode shared types for frontend"
```

---

### Task 11: OpenQuestionsEditor component

**Files:**
- Create: `resources/js/components/settings/OpenQuestionsEditor.tsx`

- [ ] **Step 1: Write the component**

Create `resources/js/components/settings/OpenQuestionsEditor.tsx`:

```tsx
import { useCallback } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { OpenQuestion, OpenQuestionType } from '@/types/questionnaire';

const TYPE_LABELS: Record<OpenQuestionType, string> = {
  short_text: 'Texte court',
  long_text: 'Texte long',
  rating_1_5: 'Note 1-5',
  rating_1_10: 'Note 1-10',
  single_choice: 'Choix unique',
  multi_choice: 'Choix multiple',
};

const MAX_QUESTIONS = 10;

function SortableRow({
  question, index, onChange, onRemove,
}: {
  question: OpenQuestion;
  index: number;
  onChange: (q: OpenQuestion) => void;
  onRemove: () => void;
}) {
  const key = question.id ?? `idx-${index}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: key });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const showOptions = question.type === 'single_choice' || question.type === 'multi_choice';

  const updateOption = (optIdx: number, label: string) => {
    const options = [...(question.options ?? [])];
    options[optIdx] = { ...options[optIdx], label };
    onChange({ ...question, options });
  };

  const addOption = () => {
    const options = [...(question.options ?? []), { id: crypto.randomUUID(), label: '' }];
    onChange({ ...question, options });
  };

  const removeOption = (optIdx: number) => {
    const options = (question.options ?? []).filter((_, i) => i !== optIdx);
    onChange({ ...question, options });
  };

  return (
    <Card ref={setNodeRef} style={style} className={cn('transition-shadow', isDragging && 'shadow-md z-10 opacity-80')}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <button {...attributes} {...listeners} className="cursor-grab p-1 text-muted-foreground" aria-label="Réordonner">
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold text-muted-foreground">Q{index + 1}</span>
          <Input
            value={question.label}
            onChange={(e) => onChange({ ...question, label: e.target.value })}
            placeholder="Texte de la question"
            className="flex-1"
            maxLength={300}
          />
          <Select
            value={question.type}
            onValueChange={(v) => onChange({ ...question, type: v as OpenQuestionType })}
          >
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(TYPE_LABELS) as OpenQuestionType[]).map((t) => (
                <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={onRemove} aria-label="Supprimer la question">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {showOptions && (
          <div className="space-y-1.5 pl-8">
            <Label className="text-xs">Options de réponse</Label>
            {(question.options ?? []).map((opt, optIdx) => (
              <div key={opt.id} className="flex items-center gap-2">
                <Input
                  value={opt.label}
                  onChange={(e) => updateOption(optIdx, e.target.value)}
                  placeholder={`Option ${optIdx + 1}`}
                  className="h-8 text-sm"
                  maxLength={200}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeOption(optIdx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="text-xs" onClick={addOption}>
              <Plus className="h-3 w-3 mr-1" /> Ajouter une option
            </Button>
          </div>
        )}

        <div className="flex items-center gap-4 pl-8">
          <label className="flex items-center gap-2 text-xs">
            <Switch
              checked={question.is_required}
              onCheckedChange={(v) => onChange({ ...question, is_required: v })}
            />
            Obligatoire
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Switch
              checked={question.is_active}
              onCheckedChange={(v) => onChange({ ...question, is_active: v })}
            />
            Active
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

interface Props {
  questions: OpenQuestion[];
  onChange: (questions: OpenQuestion[]) => void;
}

export function OpenQuestionsEditor({ questions, onChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const addQuestion = useCallback(() => {
    if (questions.length >= MAX_QUESTIONS) return;
    const q: OpenQuestion = {
      id: crypto.randomUUID(),
      label: '',
      type: 'short_text',
      options: [],
      is_required: false,
      is_active: true,
      sort_order: questions.length,
    };
    onChange([...questions, q]);
  }, [questions, onChange]);

  const updateQuestion = (idx: number, next: OpenQuestion) => {
    const copy = [...questions];
    copy[idx] = next;
    onChange(copy);
  };

  const removeQuestion = (idx: number) => {
    onChange(questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, sort_order: i })));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = questions.map((q, i) => q.id ?? `idx-${i}`);
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx < 0 || newIdx < 0) return;
    onChange(arrayMove(questions, oldIdx, newIdx).map((q, i) => ({ ...q, sort_order: i })));
  };

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={questions.map((q, i) => q.id ?? `idx-${i}`)} strategy={verticalListSortingStrategy}>
          {questions.map((q, idx) => (
            <SortableRow
              key={q.id ?? `idx-${idx}`}
              question={q}
              index={idx}
              onChange={(next) => updateQuestion(idx, next)}
              onRemove={() => removeQuestion(idx)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button
        variant="outline"
        className="w-full border-dashed gap-1.5"
        onClick={addQuestion}
        disabled={questions.length >= MAX_QUESTIONS}
      >
        <Plus className="h-4 w-4" />
        Ajouter une question ({questions.length}/{MAX_QUESTIONS})
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors (warnings about unused imports acceptable; fix any error referencing this file).

- [ ] **Step 3: Commit**

```bash
git add resources/js/components/settings/OpenQuestionsEditor.tsx
git commit -m "feat(ui): OpenQuestionsEditor component with dnd + type selector"
```

---

### Task 12: QuestionnaireSettings hub + BranchOverridePanel

**Files:**
- Create: `resources/js/components/settings/QuestionnaireSettings.tsx`
- Create: `resources/js/components/settings/BranchOverridePanel.tsx`

- [ ] **Step 1: Write BranchOverridePanel**

Create `resources/js/components/settings/BranchOverridePanel.tsx`:

```tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BranchModeEntry, QuestionnaireMode } from '@/types/questionnaire';

interface Props {
  orgMode: QuestionnaireMode;
  branches: BranchModeEntry[];
  onOverride: (branchId: string, mode: QuestionnaireMode) => void;
  onRestoreInherit: (branchId: string) => void;
}

export function BranchOverridePanel({ orgMode, branches, onOverride, onRestoreInherit }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agence</TableHead>
          <TableHead>Mode effectif</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {branches.map((b) => {
          const inherits = b.mode === null;
          const effective = (inherits ? orgMode : b.mode) as QuestionnaireMode;
          return (
            <TableRow key={b.branch_id}>
              <TableCell>{b.name}</TableCell>
              <TableCell>
                <Badge variant={inherits ? 'outline' : 'default'}>
                  {effective === 'quadrimoji' ? 'Quadrimoji' : 'Questions ouvertes'}
                  {inherits && ' · hérité'}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOverride(b.branch_id, effective === 'quadrimoji' ? 'open' : 'quadrimoji')}
                >
                  Passer en {effective === 'quadrimoji' ? 'Ouvertes' : 'Quadrimoji'}
                </Button>
                {!inherits && (
                  <Button size="sm" variant="ghost" onClick={() => onRestoreInherit(b.branch_id)}>
                    Hériter
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 2: Write QuestionnaireSettings**

Create `resources/js/components/settings/QuestionnaireSettings.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { QuestionsConfig, type QuestionConfig } from '@/components/settings/QuestionsConfig';
import { OpenQuestionsEditor } from '@/components/settings/OpenQuestionsEditor';
import { BranchOverridePanel } from '@/components/settings/BranchOverridePanel';
import type {
  QuestionnaireMode, OpenQuestion, BranchModeEntry,
} from '@/types/questionnaire';

export default function QuestionnaireSettings() {
  const { toast } = useToast();
  const [orgMode, setOrgMode] = useState<QuestionnaireMode>('quadrimoji');
  const [branches, setBranches] = useState<BranchModeEntry[]>([]);
  const [quadConfigs, setQuadConfigs] = useState<QuestionConfig[]>([]);
  const [openQuestions, setOpenQuestions] = useState<OpenQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [pendingModeChange, setPendingModeChange] = useState<QuestionnaireMode | null>(null);

  const load = useCallback(async () => {
    const [modeRes, quadRes, openRes] = await Promise.all([
      api.get('/settings/questionnaire-mode'),
      api.get('/settings/questions'),
      api.get('/settings/open-questions'),
    ]);
    setOrgMode(modeRes.data.org_mode);
    setBranches(modeRes.data.branches);
    setQuadConfigs(quadRes.data.question_configs ?? []);
    setOpenQuestions(openRes.data.open_questions ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirmModeChange = async (target: QuestionnaireMode, wipe: boolean) => {
    try {
      await api.put('/settings/questionnaire-mode', {
        mode: target,
        wipe_other_mode_config: wipe,
      });
      setOrgMode(target);
      toast({ title: 'Mode mis à jour' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.response?.data?.message, variant: 'destructive' });
    } finally {
      setPendingModeChange(null);
    }
  };

  const saveQuad = async () => {
    setSaving(true);
    try {
      await api.post('/settings/questions', { configs: quadConfigs });
      toast({ title: 'Questions enregistrées' });
    } finally { setSaving(false); }
  };

  const saveOpen = async () => {
    setSaving(true);
    try {
      await api.post('/settings/open-questions', {
        configs: openQuestions.map((q, i) => ({ ...q, sort_order: i })),
      });
      toast({ title: 'Questions enregistrées' });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="org">
        <TabsList>
          <TabsTrigger value="org">Organisation</TabsTrigger>
          <TabsTrigger value="branches">Agences</TabsTrigger>
        </TabsList>

        <TabsContent value="org" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Mode du questionnaire</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={orgMode === 'quadrimoji'}
                    onChange={() => orgMode !== 'quadrimoji' && setPendingModeChange('quadrimoji')}
                  />
                  Quadrimoji (emojis + options)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={orgMode === 'open'}
                    onChange={() => orgMode !== 'open' && setPendingModeChange('open')}
                  />
                  Questions ouvertes
                </label>
              </div>
            </CardContent>
          </Card>

          {orgMode === 'quadrimoji' ? (
            <>
              <QuestionsConfig configs={quadConfigs} onChange={setQuadConfigs} />
              <Button onClick={saveQuad} disabled={saving}>Enregistrer</Button>
            </>
          ) : (
            <>
              <Label>Questions ouvertes (1-10)</Label>
              <OpenQuestionsEditor questions={openQuestions} onChange={setOpenQuestions} />
              <Button onClick={saveOpen} disabled={saving}>Enregistrer</Button>
            </>
          )}
        </TabsContent>

        <TabsContent value="branches">
          <BranchOverridePanel
            orgMode={orgMode}
            branches={branches}
            onOverride={async (branchId, mode) => {
              await api.put('/settings/questionnaire-mode', { mode, branch_id: branchId });
              await load();
              toast({ title: 'Surcharge appliquée' });
            }}
            onRestoreInherit={async (branchId) => {
              await api.put('/settings/questionnaire-mode', { mode: orgMode, branch_id: branchId });
              await load();
              toast({ title: 'Héritage restauré' });
            }}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog open={pendingModeChange !== null} onOpenChange={(o) => !o && setPendingModeChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Changer le mode du questionnaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous passez en mode {pendingModeChange === 'open' ? '« Questions ouvertes »' : '« Quadrimoji »'}.
              Que faire de la configuration de l'autre mode ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <Button variant="outline" onClick={() => pendingModeChange && confirmModeChange(pendingModeChange, false)}>
              Conserver
            </Button>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => pendingModeChange && confirmModeChange(pendingModeChange, true)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 3: Verify TS compiles**

Run: `npx tsc --noEmit`
Expected: no errors in the new files.

- [ ] **Step 4: Commit**

```bash
git add resources/js/components/settings/QuestionnaireSettings.tsx resources/js/components/settings/BranchOverridePanel.tsx
git commit -m "feat(ui): QuestionnaireSettings hub + BranchOverridePanel"
```

---

### Task 13: Wire the new settings page into Settings.tsx

**Files:**
- Modify: `resources/js/pages/Settings.tsx`

- [ ] **Step 1: Read Settings.tsx to find the Questions tab**

Run: `rg -n "Questions|questionConfigs" resources/js/pages/Settings.tsx`

Identify the `TabsTrigger value="questions"` and the `TabsContent value="questions"` blocks.

- [ ] **Step 2: Replace the tab**

In `resources/js/pages/Settings.tsx`:

- Change the `<TabsTrigger value="questions">Questions</TabsTrigger>` label text to `Questionnaire`.
- Replace the body of `<TabsContent value="questions">...</TabsContent>` with:

```tsx
<TabsContent value="questions">
  <QuestionnaireSettings />
</TabsContent>
```

- At the top of the file, add the import:

```tsx
import QuestionnaireSettings from '@/components/settings/QuestionnaireSettings';
```

- Remove (or leave unused) the now-redundant local state: `questionConfigs`, `setQuestionConfigs`, and the direct `<QuestionsConfig ... />` usage inside this tab — the hub handles it. **Do not** remove the import of `QuestionsConfig` from `@/components/settings/QuestionsConfig` if it is used elsewhere in the file.

- [ ] **Step 3: Compile check**

Run: `npx tsc --noEmit`
Expected: no errors. If `questionConfigs` is declared but unused, prefix with `_` or remove.

- [ ] **Step 4: Commit**

```bash
git add resources/js/pages/Settings.tsx
git commit -m "feat(ui): replace Questions tab with QuestionnaireSettings hub"
```

---

## Phase 6 — Frontend: Kiosk wizard

### Task 14: Question-type renderers

**Files:**
- Create: `resources/js/components/kiosk/question-types/ShortText.tsx`
- Create: `resources/js/components/kiosk/question-types/LongText.tsx`
- Create: `resources/js/components/kiosk/question-types/Rating1to5.tsx`
- Create: `resources/js/components/kiosk/question-types/Rating1to10.tsx`
- Create: `resources/js/components/kiosk/question-types/SingleChoice.tsx`
- Create: `resources/js/components/kiosk/question-types/MultiChoice.tsx`

- [ ] **Step 1: ShortText**

Create `resources/js/components/kiosk/question-types/ShortText.tsx`:

```tsx
import { Input } from '@/components/ui/input';
interface Props { value: string; onChange: (v: string) => void; }
export default function ShortText({ value, onChange }: Props) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={100}
      placeholder="Votre réponse"
      className="text-lg h-12"
      autoFocus
    />
  );
}
```

- [ ] **Step 2: LongText**

Create `resources/js/components/kiosk/question-types/LongText.tsx`:

```tsx
import { Textarea } from '@/components/ui/textarea';
interface Props { value: string; onChange: (v: string) => void; }
export default function LongText({ value, onChange }: Props) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={500}
      placeholder="Votre réponse"
      className="text-lg min-h-32"
      autoFocus
    />
  );
}
```

- [ ] **Step 3: Rating1to5**

Create `resources/js/components/kiosk/question-types/Rating1to5.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
interface Props { value: number | null; onChange: (v: number) => void; }
export default function Rating1to5({ value, onChange }: Props) {
  return (
    <div className="flex justify-center gap-3">
      {[1, 2, 3, 4, 5].map((n) => (
        <Button
          key={n}
          size="lg"
          variant={value === n ? 'default' : 'outline'}
          onClick={() => onChange(n)}
          className={cn('w-14 h-14 text-xl', value === n && 'ring-2 ring-primary')}
        >
          {n}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Rating1to10**

Create `resources/js/components/kiosk/question-types/Rating1to10.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
interface Props { value: number | null; onChange: (v: number) => void; }
export default function Rating1to10({ value, onChange }: Props) {
  return (
    <div className="flex justify-center gap-2 flex-wrap">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <Button
          key={n}
          size="lg"
          variant={value === n ? 'default' : 'outline'}
          onClick={() => onChange(n)}
          className={cn('w-12 h-12', value === n && 'ring-2 ring-primary')}
        >
          {n}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: SingleChoice**

Create `resources/js/components/kiosk/question-types/SingleChoice.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OpenQuestionOption } from '@/types/questionnaire';

interface Props {
  options: OpenQuestionOption[];
  value: string | null;
  onChange: (v: string) => void;
}

export default function SingleChoice({ options, value, onChange }: Props) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <Button
          key={opt.id}
          variant={value === opt.id ? 'default' : 'outline'}
          className={cn('w-full justify-start h-14 text-base', value === opt.id && 'ring-2 ring-primary')}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: MultiChoice**

Create `resources/js/components/kiosk/question-types/MultiChoice.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OpenQuestionOption } from '@/types/questionnaire';

interface Props {
  options: OpenQuestionOption[];
  value: string[];
  onChange: (v: string[]) => void;
}

export default function MultiChoice({ options, value, onChange }: Props) {
  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const selected = value.includes(opt.id);
        return (
          <Button
            key={opt.id}
            variant={selected ? 'default' : 'outline'}
            className={cn('w-full justify-between h-14 text-base', selected && 'ring-2 ring-primary')}
            onClick={() => toggle(opt.id)}
          >
            <span>{opt.label}</span>
            {selected && <Check className="h-4 w-4" />}
          </Button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 7: Compile check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add resources/js/components/kiosk/question-types/
git commit -m "feat(kiosk): 6 question-type renderers for open mode"
```

---

### Task 15: OpenQuestionsWizard component

**Files:**
- Create: `resources/js/components/kiosk/OpenQuestionsWizard.tsx`

- [ ] **Step 1: Write the wizard**

Create `resources/js/components/kiosk/OpenQuestionsWizard.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ShortText from '@/components/kiosk/question-types/ShortText';
import LongText from '@/components/kiosk/question-types/LongText';
import Rating1to5 from '@/components/kiosk/question-types/Rating1to5';
import Rating1to10 from '@/components/kiosk/question-types/Rating1to10';
import SingleChoice from '@/components/kiosk/question-types/SingleChoice';
import MultiChoice from '@/components/kiosk/question-types/MultiChoice';
import type { OpenAnswer, OpenQuestion } from '@/types/questionnaire';

interface Props {
  questions: OpenQuestion[];
  onSubmit: (answers: OpenAnswer[]) => void;
}

function isEmpty(type: OpenQuestion['type'], value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (type === 'multi_choice') return Array.isArray(value) && value.length === 0;
  if (type === 'short_text' || type === 'long_text' || type === 'single_choice') {
    return typeof value === 'string' && value.trim() === '';
  }
  return false;
}

export default function OpenQuestionsWizard({ questions, onSubmit }: Props) {
  const active = useMemo(
    () => questions.filter((q) => q.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [questions],
  );
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  if (active.length === 0) {
    return null;
  }

  const q = active[idx];
  const key = q.id ?? `idx-${idx}`;
  const value = answers[key];
  const canNext = !q.is_required || !isEmpty(q.type, value);

  const update = (v: any) => setAnswers((prev) => ({ ...prev, [key]: v }));

  const next = () => {
    if (idx < active.length - 1) setIdx(idx + 1);
    else finish();
  };

  const finish = () => {
    const payload: OpenAnswer[] = active.map((qq, i) => {
      const k = qq.id ?? `idx-${i}`;
      const v = answers[k];
      return {
        question_id: qq.id ?? '',
        type: qq.type,
        answer: v === undefined ? null : v,
      };
    });
    onSubmit(payload);
  };

  const Renderer = () => {
    switch (q.type) {
      case 'short_text':   return <ShortText value={value ?? ''} onChange={update} />;
      case 'long_text':    return <LongText value={value ?? ''} onChange={update} />;
      case 'rating_1_5':   return <Rating1to5 value={value ?? null} onChange={update} />;
      case 'rating_1_10':  return <Rating1to10 value={value ?? null} onChange={update} />;
      case 'single_choice': return <SingleChoice options={q.options ?? []} value={value ?? null} onChange={update} />;
      case 'multi_choice':  return <MultiChoice options={q.options ?? []} value={value ?? []} onChange={update} />;
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 p-6">
      <div className="flex justify-center gap-1.5">
        {active.map((_, i) => (
          <span key={i} className={cn('h-2 w-2 rounded-full', i <= idx ? 'bg-primary' : 'bg-muted')} />
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">Question {idx + 1} sur {active.length}</p>

      <h2 className="text-xl font-semibold text-center">
        {q.label}
        {q.is_required && <span className="text-destructive ml-1">*</span>}
      </h2>

      <Renderer />

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}>
          Précédent
        </Button>
        <Button onClick={next} disabled={!canNext}>
          {idx < active.length - 1 ? 'Suivant' : 'Terminer'}
        </Button>
      </div>

      {q.is_required && !canNext && (
        <p className="text-center text-xs text-destructive">* Cette question est obligatoire</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Compile check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add resources/js/components/kiosk/OpenQuestionsWizard.tsx
git commit -m "feat(kiosk): OpenQuestionsWizard (one question per screen)"
```

---

### Task 16: Branch Kiosk.tsx flow by mode

**Files:**
- Modify: `resources/js/pages/Kiosk.tsx`
- Modify: `resources/js/services/kioskService.ts`

- [ ] **Step 1: Extend the Step type and add open-mode branching**

In `resources/js/pages/Kiosk.tsx`:

- Change the `Step` type to:

```tsx
type Step = 'sentiment' | 'followup' | 'open_wizard' | 'contact' | 'thankyou';
```

- Add the import near the top:

```tsx
import OpenQuestionsWizard from '@/components/kiosk/OpenQuestionsWizard';
import type { OpenAnswer, OpenQuestion } from '@/types/questionnaire';
```

- Add two new state hooks alongside the existing feedback state:

```tsx
const [openAnswers, setOpenAnswers] = useState<OpenAnswer[] | null>(null);
```

- Locate the place where `setStep('followup')` is called after a sentiment is picked. Replace it with:

```tsx
const mode = (config as any)?.questionnaire_mode ?? 'quadrimoji';
setStep(mode === 'open' ? 'open_wizard' : 'followup');
```

- Extend the `resetFlow` function to also reset `openAnswers`:

```tsx
setOpenAnswers(null);
```

- Render the wizard. Where the existing followup JSX block is, add a sibling:

```tsx
{step === 'open_wizard' && (
  <OpenQuestionsWizard
    questions={((config as any)?.open_questions ?? []) as OpenQuestion[]}
    onSubmit={(answers) => {
      setOpenAnswers(answers);
      setStep('contact');
    }}
  />
)}
```

- [ ] **Step 2: Pass mode + open answers to the submit call**

Find the call to `submitKioskFeedback(...)` (most likely in the contact-step handler). Update it to include:

```tsx
submitKioskFeedback({
  // existing fields (branch_id, sentiment, selected_options, free_text, contact fields...)
  questionnaire_mode: ((config as any)?.questionnaire_mode ?? 'quadrimoji'),
  follow_up_responses: openAnswers ?? undefined,
});
```

If the existing code passes a field named `follow_up_responses` for the Quadrimoji path, keep it and only override with `openAnswers` when mode is `open`:

```tsx
follow_up_responses: openAnswers ?? (/* existing quadrimoji payload */),
```

- [ ] **Step 3: Extend the service type**

In `resources/js/services/kioskService.ts`, update the `submitKioskFeedback` payload type to accept the new optional fields:

```typescript
export interface KioskFeedbackPayload {
  branch_id: string;
  sentiment: string;
  questionnaire_mode?: 'quadrimoji' | 'open';
  follow_up_responses?: unknown[] | null;
  // ...keep other existing fields intact
}
```

(Match the existing interface name if it differs.)

- [ ] **Step 4: Compile & run**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run dev` (in a separate terminal), open the kiosk URL for a test branch. Pick an org with `questionnaire_mode = 'open'` and verify the wizard appears after the sentiment screen.

- [ ] **Step 5: Commit**

```bash
git add resources/js/pages/Kiosk.tsx resources/js/services/kioskService.ts
git commit -m "feat(kiosk): branch flow by questionnaire_mode, wire open wizard"
```

---

## Phase 7 — Reports

### Task 17: Reports backend — mode-aware sections

**Files:**
- Modify: `app/Http/Controllers/Api/ReportController.php`

- [ ] **Step 1: Inspect current report shape**

Run: `rg -n "public function" app/Http/Controllers/Api/ReportController.php`

Identify the methods that build the PDF and Excel payloads (likely `generate`, `export`, or similar).

- [ ] **Step 2: Split feedbacks by mode in the builder**

In the method that aggregates feedbacks for a set of branches, split them into two buckets:

```php
$feedbacks = Feedback::whereIn('branch_id', $branchIds)
    ->whereBetween('created_at', [$from, $to])
    ->get();

$quadFeedbacks = $feedbacks->where('questionnaire_mode', 'quadrimoji');
$openFeedbacks = $feedbacks->where('questionnaire_mode', 'open');
```

Then pass both collections to the view/export layer. For the Open section, also resolve the `OpenQuestion` rows referenced in each feedback's `follow_up_responses` so labels can be displayed:

```php
$openQuestionIds = $openFeedbacks
    ->pluck('follow_up_responses')
    ->flatten(1)
    ->pluck('question_id')
    ->filter()
    ->unique()
    ->values();

$openQuestions = \App\Models\OpenQuestion::whereIn('id', $openQuestionIds)->get()->keyBy('id');
```

- [ ] **Step 3: Add an optional mode filter query param**

In the request validation block:

```php
'mode' => 'nullable|in:quadrimoji,open',
```

Then, after fetching feedbacks:

```php
if (!empty($validated['mode'])) {
    $feedbacks = $feedbacks->where('questionnaire_mode', $validated['mode']);
}
```

- [ ] **Step 4: Update the PDF/Excel output**

Wherever the controller renders the PDF/Excel response, add a new section for `$openFeedbacks` that outputs a table: `Date | Smiley | Q1 label | Q2 label | ...`. Truncate each cell to ~60 chars with `mb_strimwidth(..., 0, 60, '…')`.

Keep the existing Quadrimoji section unchanged. If the report contains only one mode, render only that section (skip the empty one).

Because the exact view structure varies, make the smallest change that preserves existing output for Quadrimoji-only reports and adds the new Open section when `$openFeedbacks->isNotEmpty()`.

- [ ] **Step 5: Smoke-test via API**

Run the server (`php artisan serve`) and hit the existing report endpoint for an org with mixed modes. Verify the JSON/PDF/Excel includes the new section when Open feedbacks exist.

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/Api/ReportController.php
git commit -m "feat(reports): mode-aware sections + optional mode filter"
```

---

### Task 18: Reports UI — mode filter

**Files:**
- Modify: `resources/js/pages/Reports.tsx`

- [ ] **Step 1: Add the filter UI**

Locate the filters bar in `resources/js/pages/Reports.tsx`. Add a new `<Select>` alongside the existing filters:

```tsx
<Select value={modeFilter} onValueChange={(v) => setModeFilter(v as 'all' | 'quadrimoji' | 'open')}>
  <SelectTrigger className="w-48"><SelectValue placeholder="Mode" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Tous les modes</SelectItem>
    <SelectItem value="quadrimoji">Quadrimoji</SelectItem>
    <SelectItem value="open">Questions ouvertes</SelectItem>
  </SelectContent>
</Select>
```

Add state:

```tsx
const [modeFilter, setModeFilter] = useState<'all' | 'quadrimoji' | 'open'>('all');
```

And include it in the report request payload:

```tsx
const payload = {
  // ...existing fields
  ...(modeFilter !== 'all' && { mode: modeFilter }),
};
```

- [ ] **Step 2: Compile & smoke**

Run: `npx tsc --noEmit` — no errors.
Run: `npm run dev`, open Reports page, verify the filter renders and requests include `mode` when non-`all`.

- [ ] **Step 3: Commit**

```bash
git add resources/js/pages/Reports.tsx
git commit -m "feat(reports-ui): questionnaire mode filter"
```

---

## Phase 8 — Verification

### Task 19: Full test suite + manual check + protocole update

**Files:**
- Modify: `PROTOCOLE_TEST.md`

- [ ] **Step 1: Run the full test suite**

Run: `./vendor/bin/phpunit`
Expected: all tests green. If any existing test broke, inspect and fix (most likely related to changes in Models' `$fillable` or `Feedback` store payload).

- [ ] **Step 2: Run type check + lint**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual QA — Quadrimoji regression**

Start the dev stack:

```bash
composer dev
```

Log in as `admin@bgfi.com` / `password`. Verify:
- Settings > Questionnaire still shows the 4 Quadrimoji sentiments (org mode defaulted to `quadrimoji`).
- Kiosk flow for an existing branch still works end-to-end (sentiment → follow-up → contact → thank you).
- A submitted feedback now has `questionnaire_mode = 'quadrimoji'` (check via `php artisan tinker`).

- [ ] **Step 4: Manual QA — Open mode**

In Settings > Questionnaire:
- Switch the org mode to "Questions ouvertes" (choose "Conserver" in the dialog).
- Add 3 questions: one `short_text` (required), one `rating_1_5` (optional), one `multi_choice` with 3 options (required).
- Save.

On the kiosk:
- Open the kiosk URL for a branch inheriting the org mode.
- Pick a smiley → verify the wizard appears with question 1.
- Try to click "Suivant" with the required field empty → verify it's disabled.
- Fill all 3 questions, reach the contact screen, complete and submit.
- Verify `feedbacks.questionnaire_mode = 'open'` and `follow_up_responses` contains the 3 typed answers.

- [ ] **Step 5: Branch override check**

In Settings > Questionnaire > onglet Agences:
- Pick one branch, click "Passer en Quadrimoji" (while org is in `open`).
- Open the kiosk URL for that branch → verify it shows the Quadrimoji flow, while others still show the wizard.

- [ ] **Step 6: Update PROTOCOLE_TEST.md**

Append a new section to `PROTOCOLE_TEST.md`:

```markdown
---

## 12. Questionnaire — Modes Quadrimoji & Ouvert

| # | Test | Action | Résultat attendu |
|---|------|--------|-----------------|
| 12.1 | Mode org par défaut | Fresh install ou org existante | Mode = `quadrimoji`, aucun changement visible |
| 12.2 | Basculer l'org en mode Open | Settings > Questionnaire > Organisation, cocher « Questions ouvertes » | Dialog de confirmation avec 3 options (Annuler / Conserver / Supprimer) |
| 12.3 | Sauver des questions ouvertes | Ajouter 3 questions (tous types), Enregistrer | Questions persistées, rechargement OK |
| 12.4 | Limite 10 questions | Tenter d'ajouter la 11e | Bouton désactivé, compteur à 10/10 |
| 12.5 | Kiosque — wizard | Ouvrir le kiosque d'une agence en mode Open | Smileys affichés puis wizard une question par écran avec indicateur de progression |
| 12.6 | Obligatoire bloque Suivant | Laisser une question obligatoire vide | Bouton « Suivant » désactivé, message rouge |
| 12.7 | Surcharge agence | Settings > Questionnaire > Agences, surcharger une agence | Badge mode change, kiosque de l'agence suit la surcharge |
| 12.8 | Héritage agence | Cliquer « Hériter » sur une agence surchargée | Mode redevient celui de l'org, badge « hérité » |
| 12.9 | Feedback taggé | Soumettre un feedback en chaque mode | `feedbacks.questionnaire_mode` correct |
| 12.10 | Rapport multi-mode | Générer un rapport sur une zone où agences mélangent modes | Sections séparées (Quadrimoji / Questions ouvertes) |
| 12.11 | Filtre mode | Dans Reports, sélectionner « Quadrimoji » | Le rapport ne contient plus que les agences en mode Quadrimoji |
| 12.12 | Permission dir. agence | Se connecter en directeur d'agence, surcharger son agence | Autorisé. Changer le mode org → 403 |
```

- [ ] **Step 7: Commit**

```bash
git add PROTOCOLE_TEST.md
git commit -m "docs: add section 12 to PROTOCOLE_TEST for questionnaire modes"
```

---

## Spec Coverage Check

| Spec requirement | Covered by |
|---|---|
| Org + branch `questionnaire_mode` column with fallback | Tasks 1, 4, 5 |
| `feedbacks.questionnaire_mode` tagged at collection | Tasks 1, 9 |
| `open_questions` table with 6 types | Tasks 2, 3 |
| Mode resolution helper | Tasks 4, 5 |
| GET/PUT `/settings/questionnaire-mode` | Task 6 |
| GET/POST `/settings/open-questions` with 10-max + validation | Task 7 |
| `/kiosk/config/{branchId}` enriched | Task 8 |
| Role-based permissions (A2/B3/C1) | Tasks 6, 7 |
| Admin UI: hub + mode switcher + confirmation dialog | Task 12 |
| Admin UI: OpenQuestionsEditor with types/required/dnd | Task 11 |
| Admin UI: per-branch override panel | Task 12 |
| Rename "Questions" → "Questionnaire" | Task 13 |
| Kiosk wizard with 6 type renderers | Tasks 14, 15 |
| Kiosk flow branching by mode | Task 16 |
| Reports mode-aware sections | Task 17 |
| Reports UI mode filter | Task 18 |
| PROTOCOLE_TEST updated | Task 19 |
| Backwards compatibility (existing orgs → quadrimoji) | Task 1 (default) + Task 19 manual check |
