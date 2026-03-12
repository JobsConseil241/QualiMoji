<?php

namespace Database\Seeders;

use App\Models\WhatsappLog;
use App\Models\Feedback;
use Illuminate\Database\Seeder;

class WhatsappLogSeeder extends Seeder
{
    public function run(): void
    {
        // Get some feedbacks with phone numbers
        $feedbacksWithPhone = Feedback::whereNotNull('customer_phone')->get();

        foreach ($feedbacksWithPhone as $feedback) {
            $branch = $feedback->branch;

            WhatsappLog::create([
                'feedback_id' => $feedback->id,
                'phone' => $feedback->customer_phone,
                'message_type' => 'notification',
                'sentiment' => $feedback->sentiment,
                'branch_name' => $branch?->name,
                'status' => 'delivered',
                'created_at' => $feedback->created_at->addMinutes(2),
            ]);

            // Add a follow-up for negative feedbacks
            if ($feedback->sentiment === 'negative') {
                WhatsappLog::create([
                    'feedback_id' => $feedback->id,
                    'phone' => $feedback->customer_phone,
                    'message_type' => 'followup',
                    'sentiment' => $feedback->sentiment,
                    'branch_name' => $branch?->name,
                    'status' => 'sent',
                    'created_at' => $feedback->created_at->addHours(1),
                ]);
            }
        }

        // Add a failed log entry
        WhatsappLog::create([
            'phone' => '+33 6 99 99 99 99',
            'message_type' => 'notification',
            'sentiment' => 'negative',
            'branch_name' => 'Agence Lille Europe',
            'status' => 'failed',
            'error_message' => 'Numéro invalide ou non enregistré sur WhatsApp',
            'created_at' => '2026-03-01 15:00:00',
        ]);
    }
}
