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
        $isNegative = in_array($sentiment, ['unhappy', 'very_unhappy']);
        $templateName = $isNegative ? 'feedback_followup' : 'feedback_thank_you';

        // Clean phone number: remove '+' prefix, spaces, dashes
        $cleanPhone = preg_replace('/[^0-9]/', '', $phone);

        $customerName = $this->feedback->customer_name ?? 'Client';
        $branchName = $branch?->name ?? '';

        // Build message text
        if ($isNegative) {
            $messageBody = "Bonjour {$customerName},\n\nNous avons bien reçu votre retour concernant votre visite à {$branchName}. Nous sommes désolés que votre expérience n'ait pas été à la hauteur de vos attentes.\n\nNotre équipe va vous recontacter dans les plus brefs délais pour en discuter.\n\nMerci de votre confiance.";
        } else {
            $messageBody = "Bonjour {$customerName},\n\nMerci pour votre retour positif suite à votre visite à {$branchName} ! Votre satisfaction est notre priorité.\n\nÀ bientôt !";
        }

        try {
            // Whapi.cloud API format — force IPv4 and extend timeout
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiToken,
                'Content-Type' => 'application/json',
            ])->withOptions([
                'force_ip_resolve' => 'v4',
                'connect_timeout' => 30,
                'timeout' => 30,
            ])->post($apiUrl . '/messages/text', [
                'to' => $cleanPhone,
                'body' => $messageBody,
            ]);

            WhatsappLog::create([
                'feedback_id' => $this->feedback->id,
                'phone' => $phone,
                'message_type' => $templateName,
                'sentiment' => $sentiment,
                'branch_name' => $branchName,
                'status' => $response->successful() ? 'sent' : 'failed',
                'error_message' => $response->successful() ? null : $response->body(),
            ]);

            if ($response->successful()) {
                $this->feedback->update(['customer_notified' => true]);
            } else {
                Log::warning("WhatsApp send failed: {$response->status()} - {$response->body()}");
            }
        } catch (\Exception $e) {
            WhatsappLog::create([
                'feedback_id' => $this->feedback->id,
                'phone' => $phone,
                'message_type' => $templateName,
                'sentiment' => $sentiment,
                'branch_name' => $branchName,
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            Log::error("WhatsApp send failed: {$e->getMessage()}");
        }
    }
}
