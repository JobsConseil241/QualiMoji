<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\KioskConfig;
use App\Models\OpenQuestion;
use App\Models\QuestionConfig;
use App\Models\Feedback;
use App\Models\Organization;
use App\Jobs\SendCustomerWhatsApp;
use Illuminate\Http\Request;

class KioskController extends Controller
{
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

        // Branch override REPLACES org defaults (no merge). If the branch has any
        // QuestionConfig rows (active or not), use only those; otherwise fall back
        // to the org-level configs.
        $branchHasSentiments = QuestionConfig::where('branch_id', $branchId)->exists();
        $response['question_configs'] = QuestionConfig::query()
            ->when($branchHasSentiments,
                fn ($q) => $q->where('branch_id', $branchId),
                fn ($q) => $q->where('organization_id', $org->id)->whereNull('branch_id')
            )
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        if ($mode === 'open') {
            $branchHasOpenQuestions = OpenQuestion::where('branch_id', $branchId)->exists();
            $response['open_questions'] = OpenQuestion::query()
                ->when($branchHasOpenQuestions,
                    fn ($q) => $q->where('branch_id', $branchId),
                    fn ($q) => $q->where('organization_id', $org->id)->whereNull('branch_id')
                )
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get();
        }

        return response()->json($response);
    }

    public function updateContact(Request $request, Feedback $feedback)
    {
        $validated = $request->validate([
            'customer_name' => 'nullable|string|max:255',
            'customer_gender' => 'nullable|string|in:M,F',
            'customer_email' => 'nullable|email|max:255',
            'customer_phone' => 'required|string|max:30',
            'wants_callback' => 'boolean',
        ]);

        $feedback->update($validated);

        if (!empty($validated['customer_phone'])) {
            SendCustomerWhatsApp::dispatchSync($feedback->fresh());
        }

        return response()->json(['feedback' => $feedback]);
    }
}
