<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QuestionConfig;
use App\Models\KioskConfig;
use App\Models\KpiConfig;
use App\Models\NotificationConfig;
use App\Models\Organization;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    // ── Question Configs ──

    public function getQuestionConfigs(Request $request)
    {
        $user = $request->user();
        $configs = QuestionConfig::where('user_id', $user->id)
            ->orWhere('organization_id', $user->organization_id)
            ->orderBy('sort_order')
            ->get();

        return response()->json(['question_configs' => $configs]);
    }

    public function saveQuestionConfigs(Request $request)
    {
        $validated = $request->validate([
            'configs' => 'required|array',
            'configs.*.sentiment' => 'required|string',
            'configs.*.emoji' => 'nullable|string',
            'configs.*.label' => 'nullable|string',
            'configs.*.question' => 'nullable|string',
            'configs.*.options' => 'nullable|array',
            'configs.*.allow_free_text' => 'boolean',
            'configs.*.is_active' => 'boolean',
            'configs.*.sort_order' => 'nullable|integer',
            'configs.*.branch_id' => 'nullable|string',
        ]);

        $user = $request->user();
        $saved = [];
        $sentiments = [];

        foreach ($validated['configs'] as $index => $config) {
            $sentiments[] = $config['sentiment'];

            $saved[] = QuestionConfig::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'sentiment' => $config['sentiment'],
                    'branch_id' => $config['branch_id'] ?? null,
                ],
                [
                    'organization_id' => $user->organization_id,
                    'user_id' => $user->id,
                    'emoji' => $config['emoji'] ?? null,
                    'label' => $config['label'] ?? null,
                    'question' => $config['question'] ?? null,
                    'options' => $config['options'] ?? [],
                    'allow_free_text' => $config['allow_free_text'] ?? true,
                    'is_active' => $config['is_active'] ?? true,
                    'sort_order' => $config['sort_order'] ?? $index,
                ]
            );
        }

        // Remove configs that were deleted by the user
        QuestionConfig::where('user_id', $user->id)
            ->whereNotIn('sentiment', $sentiments)
            ->delete();

        AuditLog::create([
            'actor_id' => $user->id,
            'actor_email' => $user->email,
            'action' => 'question_configs.updated',
            'target_type' => 'question_config',
            'details' => ['count' => count($saved)],
        ]);

        return response()->json(['question_configs' => $saved]);
    }

    // ── Kiosk Config ──

    public function getKioskConfig(Request $request)
    {
        $user = $request->user();
        $branchId = $request->get('branch_id');

        $config = KioskConfig::where('organization_id', $user->organization_id)
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->first();

        return response()->json(['kiosk_config' => $config]);
    }

    public function saveKioskConfig(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'nullable|string',
            'welcome_message' => 'nullable|string|max:500',
            'start_button_text' => 'nullable|string|max:255',
            'inactivity_timeout' => 'nullable|integer|min:5|max:300',
            'screensaver_delay' => 'nullable|integer|min:10|max:600',
            'auto_reset_delay' => 'nullable|integer|min:3|max:60',
            'screensaver_enabled' => 'boolean',
            'sounds_enabled' => 'boolean',
            'haptic_enabled' => 'boolean',
            'offline_mode_enabled' => 'boolean',
            'screensaver_slides' => 'nullable|array',
            'message_templates' => 'nullable|array',
            'footer_text' => 'nullable|string|max:255',
        ]);

        $user = $request->user();
        $validated['organization_id'] = $user->organization_id;

        $config = KioskConfig::updateOrCreate(
            [
                'organization_id' => $user->organization_id,
                'branch_id' => $validated['branch_id'] ?? null,
            ],
            $validated
        );

        AuditLog::create([
            'actor_id' => $user->id,
            'actor_email' => $user->email,
            'action' => 'kiosk_config.updated',
            'target_type' => 'kiosk_config',
            'target_id' => $config->id,
        ]);

        return response()->json(['kiosk_config' => $config]);
    }

    // ── KPI Configs ──

    public function getKpiConfigs(Request $request)
    {
        $user = $request->user();
        $configs = KpiConfig::where('user_id', $user->id)
            ->orWhere('organization_id', $user->organization_id)
            ->get();

        return response()->json(['kpi_configs' => $configs]);
    }

    public function saveKpiConfigs(Request $request)
    {
        $user = $request->user();
        $saved = [];

        // Support { thresholds: [...], branch_overrides: {...} } format from frontend
        if ($request->has('thresholds')) {
            foreach ($request->input('thresholds', []) as $t) {
                $saved[] = KpiConfig::updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'config_key' => $t['config_key'],
                        'branch_id' => $t['branch_id'] ?? null,
                    ],
                    [
                        'organization_id' => $user->organization_id,
                        'config_value' => $t['config_value'],
                    ]
                );
            }
            foreach ($request->input('branch_overrides', []) as $branchId => $configs) {
                foreach ($configs as $config) {
                    $saved[] = KpiConfig::updateOrCreate(
                        [
                            'user_id' => $user->id,
                            'config_key' => $config['key'] ?? $config['config_key'] ?? '',
                            'branch_id' => $branchId,
                        ],
                        [
                            'organization_id' => $user->organization_id,
                            'config_value' => $config,
                        ]
                    );
                }
            }
        } else {
            $validated = $request->validate([
                'configs' => 'required|array',
                'configs.*.config_key' => 'required|string',
                'configs.*.config_value' => 'required',
                'configs.*.branch_id' => 'nullable|string',
            ]);
            foreach ($validated['configs'] as $config) {
                $saved[] = KpiConfig::updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'config_key' => $config['config_key'],
                        'branch_id' => $config['branch_id'] ?? null,
                    ],
                    [
                        'organization_id' => $user->organization_id,
                        'config_value' => $config['config_value'],
                    ]
                );
            }
        }

        return response()->json(['kpi_configs' => $saved]);
    }

    // ── Notification Configs ──

    public function getNotificationConfigs(Request $request)
    {
        $configs = NotificationConfig::where('user_id', $request->user()->id)->get();

        return response()->json(['notification_configs' => $configs]);
    }

    public function saveNotificationConfigs(Request $request)
    {
        $user = $request->user();
        $saved = [];

        // Frontend sends { channels: [...] }
        $items = $request->input('channels', $request->input('configs', []));

        foreach ($items as $config) {
            $saved[] = NotificationConfig::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'channel' => $config['channel'],
                ],
                [
                    'is_enabled' => $config['is_enabled'] ?? true,
                    'recipients' => $config['recipients'] ?? [],
                    'schedule_start' => $config['schedule_start'] ?? null,
                    'schedule_end' => $config['schedule_end'] ?? null,
                    'max_frequency_minutes' => $config['max_frequency_minutes'] ?? null,
                ]
            );
        }

        return response()->json(['notification_configs' => $saved]);
    }

    // ── Organization Settings ──

    public function getOrganization(Request $request)
    {
        $org = $request->user()->organization;

        return response()->json(['organization' => $org]);
    }

    public function updateOrganization(Request $request)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'logo_url' => 'nullable|string|max:2048',
            'primary_color' => 'nullable|string|max:7',
            'kiosk_logo_size' => 'nullable|string|in:small,medium,large',
            'kiosk_logo_position' => 'nullable|string|in:left,center,right',
            'kiosk_show_org_name' => 'boolean',
            'kiosk_show_branch_name' => 'boolean',
        ]);

        $org = $request->user()->organization;
        $org->update($validated);

        AuditLog::create([
            'actor_id' => $request->user()->id,
            'actor_email' => $request->user()->email,
            'action' => 'organization.updated',
            'target_type' => 'organization',
            'target_id' => $org->id,
            'details' => $validated,
        ]);

        return response()->json(['organization' => $org]);
    }

    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => 'required|image|max:2048',
        ]);

        $path = $request->file('logo')->store('logos', 'public');
        $url = '/storage/' . $path;

        $org = $request->user()->organization;
        $org->update(['logo_url' => $url]);

        return response()->json(['url' => $url]);
    }

    public function uploadKioskSlide(Request $request)
    {
        $request->validate([
            'file' => 'required|image|max:5120',
        ]);

        $path = $request->file('file')->store('kiosk-slides', 'public');
        $url = '/storage/' . $path;

        return response()->json(['url' => $url]);
    }

    // ── Audit Logs ──

    public function getAuditLogs(Request $request)
    {
        $logs = AuditLog::where('actor_id', $request->user()->id)
            ->orWhereHas('actor', function ($q) use ($request) {
                $q->where('organization_id', $request->user()->organization_id);
            })
            ->orderByDesc('created_at')
            ->limit($request->get('limit', 100))
            ->get();

        return response()->json(['audit_logs' => $logs]);
    }
}
