<?php

namespace App\Jobs;

use App\Models\Feedback;
use App\Models\WhatsappLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendCustomerWhatsApp implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Feedback $feedback
    ) {}

    public function handle(): void
    {
        $phone = $this->feedback->customer_phone;
        if (!$phone) return;

        $apiUrl = config('services.whatsapp.api_url');
        $apiToken = config('services.whatsapp.api_token');

        if (!$apiUrl || !$apiToken) {
            Log::warning('WhatsApp API not configured, skipping customer message');
            return;
        }

        $branch = $this->feedback->branch;
        $sentiment = $this->feedback->sentiment;
        $templateName = in_array($sentiment, ['unhappy', 'very_unhappy'])
            ? 'feedback_followup'
            : 'feedback_thank_you';

        try {
            $response = Http::withToken($apiToken)->post($apiUrl . '/messages', [
                'messaging_product' => 'whatsapp',
                'to' => $phone,
                'type' => 'template',
                'template' => [
                    'name' => $templateName,
                    'language' => ['code' => 'fr'],
                    'components' => [
                        [
                            'type' => 'body',
                            'parameters' => [
                                ['type' => 'text', 'text' => $this->feedback->customer_name ?? 'Client'],
                                ['type' => 'text', 'text' => $branch?->name ?? ''],
                            ],
                        ],
                    ],
                ],
            ]);

            WhatsappLog::create([
                'feedback_id' => $this->feedback->id,
                'phone' => $phone,
                'message_type' => $templateName,
                'sentiment' => $sentiment,
                'branch_name' => $branch?->name,
                'status' => $response->successful() ? 'sent' : 'failed',
                'error_message' => $response->successful() ? null : $response->body(),
            ]);

            if ($response->successful()) {
                $this->feedback->update(['customer_notified' => true]);
            }
        } catch (\Exception $e) {
            WhatsappLog::create([
                'feedback_id' => $this->feedback->id,
                'phone' => $phone,
                'message_type' => $templateName,
                'sentiment' => $sentiment,
                'branch_name' => $branch?->name,
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            Log::error("WhatsApp send failed: {$e->getMessage()}");
        }
    }
}
