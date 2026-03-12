<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KioskConfig;
use App\Models\WhatsappLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class WhatsAppTemplateController extends Controller
{
    public function index(Request $request)
    {
        // Return template list (could be config-driven)
        $templates = [
            [
                'id' => 'feedback_thank_you',
                'name' => 'Remerciement feedback',
                'description' => 'Envoyé après un feedback positif',
                'variables' => ['customer_name', 'branch_name'],
            ],
            [
                'id' => 'feedback_followup',
                'name' => 'Suivi feedback négatif',
                'description' => 'Envoyé après un feedback négatif',
                'variables' => ['customer_name', 'branch_name'],
            ],
            [
                'id' => 'callback_confirmation',
                'name' => 'Confirmation rappel',
                'description' => 'Confirme la demande de rappel',
                'variables' => ['customer_name'],
            ],
        ];

        return response()->json(['templates' => $templates]);
    }

    public function saveTemplates(Request $request)
    {
        $validated = $request->validate([
            'whatsapp_thankyou' => 'nullable|string',
            'whatsapp_followup' => 'nullable|string',
        ]);

        $orgId = $request->user()->organization_id;

        $config = KioskConfig::where('organization_id', $orgId)
            ->whereNull('branch_id')
            ->first();

        if ($config) {
            $templates = $config->message_templates ?? [];
            $templates['whatsapp_thankyou'] = $validated['whatsapp_thankyou'] ?? '';
            $templates['whatsapp_followup'] = $validated['whatsapp_followup'] ?? '';
            $config->update(['message_templates' => $templates]);
        }

        return response()->json(['message' => 'Templates saved successfully']);
    }

    public function sendTest(Request $request)
    {
        $validated = $request->validate([
            'template_id' => 'required|string',
            'phone' => 'required|string',
            'variables' => 'nullable|array',
        ]);

        try {
            $apiUrl = config('services.whatsapp.api_url');
            $apiToken = config('services.whatsapp.api_token');

            if (!$apiUrl || !$apiToken) {
                return response()->json(['error' => 'WhatsApp API not configured'], 422);
            }

            $response = Http::withToken($apiToken)
                ->post($apiUrl . '/messages', [
                    'messaging_product' => 'whatsapp',
                    'to' => $validated['phone'],
                    'type' => 'template',
                    'template' => [
                        'name' => $validated['template_id'],
                        'language' => ['code' => 'fr'],
                        'components' => !empty($validated['variables']) ? [
                            [
                                'type' => 'body',
                                'parameters' => collect($validated['variables'])->map(fn($v) => [
                                    'type' => 'text',
                                    'text' => $v,
                                ])->values()->all(),
                            ]
                        ] : [],
                    ],
                ]);

            WhatsappLog::create([
                'phone' => $validated['phone'],
                'message_type' => 'test',
                'status' => $response->successful() ? 'sent' : 'failed',
                'error_message' => $response->successful() ? null : $response->body(),
            ]);

            if ($response->successful()) {
                return response()->json(['message' => 'Test message sent successfully']);
            }

            return response()->json(['error' => 'Failed to send message', 'details' => $response->json()], 422);
        } catch (\Exception $e) {
            WhatsappLog::create([
                'phone' => $validated['phone'],
                'message_type' => 'test',
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'Failed to send message: ' . $e->getMessage()], 500);
        }
    }

    public function logs(Request $request)
    {
        $logs = WhatsappLog::orderByDesc('created_at')
            ->paginate($request->get('per_page', 25));

        return response()->json($logs);
    }
}
