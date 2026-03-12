<?php

namespace App\Jobs;

use App\Models\Branch;
use App\Models\NotificationConfig;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $type,
        public Branch $branch,
        public array $data = []
    ) {}

    public function handle(): void
    {
        $org = $this->branch->organization;
        if (!$org) return;

        // Get all users in this organization
        $users = User::where('organization_id', $org->id)->get();

        foreach ($users as $user) {
            $configs = NotificationConfig::where('user_id', $user->id)
                ->where('is_enabled', true)
                ->get();

            foreach ($configs as $config) {
                $this->sendViaChannel($config, $user);
            }
        }
    }

    private function sendViaChannel(NotificationConfig $config, User $user): void
    {
        try {
            match ($config->channel) {
                'email' => $this->sendEmail($config, $user),
                'whatsapp' => $this->sendWhatsApp($config, $user),
                default => Log::warning("Unknown notification channel: {$config->channel}"),
            };
        } catch (\Exception $e) {
            Log::error("Failed to send notification via {$config->channel}: {$e->getMessage()}");
        }
    }

    private function sendEmail(NotificationConfig $config, User $user): void
    {
        $recipients = $config->recipients ?? [$user->email];

        foreach ($recipients as $email) {
            Mail::send('emails.alert-notification', [
                'type' => $this->type,
                'branch' => $this->branch,
                'data' => $this->data,
                'user' => $user,
            ], function ($message) use ($email) {
                $message->to($email)
                    ->subject("QualiMoji - Alerte: {$this->type}");
            });
        }
    }

    private function sendWhatsApp(NotificationConfig $config, User $user): void
    {
        $apiUrl = config('services.whatsapp.api_url');
        $apiToken = config('services.whatsapp.api_token');

        if (!$apiUrl || !$apiToken) return;

        $recipients = $config->recipients ?? [];

        foreach ($recipients as $phone) {
            Http::withToken($apiToken)->post($apiUrl . '/messages', [
                'messaging_product' => 'whatsapp',
                'to' => $phone,
                'type' => 'template',
                'template' => [
                    'name' => 'alert_notification',
                    'language' => ['code' => 'fr'],
                    'components' => [
                        [
                            'type' => 'body',
                            'parameters' => [
                                ['type' => 'text', 'text' => $this->type],
                                ['type' => 'text', 'text' => $this->branch->name],
                                ['type' => 'text', 'text' => $this->data['count'] ?? ''],
                            ],
                        ],
                    ],
                ],
            ]);
        }
    }
}
