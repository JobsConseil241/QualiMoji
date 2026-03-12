<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\KioskConfig;
use App\Models\QuestionConfig;
use App\Models\Feedback;
use App\Models\Organization;
use App\Jobs\SendCustomerWhatsApp;
use Illuminate\Http\Request;

class KioskController extends Controller
{
    public function config(Request $request, string $branchId)
    {
        $branch = Branch::findOrFail($branchId);
        $org = $branch->organization;

        // Get kiosk config (branch-specific or org-level fallback)
        $kioskConfig = KioskConfig::where('branch_id', $branchId)->first()
            ?? KioskConfig::where('organization_id', $org->id)->whereNull('branch_id')->first();

        // Get question configs
        $questionConfigs = QuestionConfig::where(function ($q) use ($branchId, $org) {
            $q->where('branch_id', $branchId)
              ->orWhere(function ($q2) use ($org) {
                  $q2->where('organization_id', $org->id)->whereNull('branch_id');
              });
        })->where('is_active', true)->orderBy('sort_order')->get();

        return response()->json([
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
            'question_configs' => $questionConfigs,
        ]);
    }

    public function updateContact(Request $request, Feedback $feedback)
    {
        $validated = $request->validate([
            'customer_name' => 'nullable|string|max:255',
            'customer_email' => 'nullable|email|max:255',
            'customer_phone' => 'nullable|string|max:30',
            'wants_callback' => 'boolean',
        ]);

        $feedback->update($validated);

        if (!empty($validated['customer_phone'])) {
            SendCustomerWhatsApp::dispatchSync($feedback->fresh());
        }

        return response()->json(['feedback' => $feedback]);
    }
}
