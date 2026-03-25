<?php

namespace App\Jobs;

use App\Models\Branch;
use App\Models\NotificationConfig;
use App\Models\NotificationLog;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SendNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $type,
        public Branch $branch,
        public array $data = [],
        public ?string $alertId = null
    ) {}

    public function handle(): void
    {
        $org = $this->branch->organization;
        if (!$org) return;

        $users = User::where('organization_id', $org->id)->get();

        foreach ($users as $user) {
            $configs = NotificationConfig::where('user_id', $user->id)
                ->where('is_enabled', true)
                ->get();

            foreach ($configs as $config) {
                // Check schedule
                if (!$this->isWithinSchedule($config)) {
                    Log::debug("Notification skipped: outside schedule for user {$user->id} via {$config->channel}");
                    continue;
                }

                // Check frequency throttle
                if (!$this->isWithinFrequency($config, $this->branch->id)) {
                    Log::debug("Notification throttled for user {$user->id} via {$config->channel} for branch {$this->branch->id}");
                    continue;
                }

                $this->sendViaChannel($config, $user);
            }
        }
    }

    private function isWithinSchedule(NotificationConfig $config): bool
    {
        $start = $config->schedule_start;
        $end = $config->schedule_end;

        if (is_null($start) || is_null($end)) return true;

        $currentHour = Carbon::now()->hour;
        return $currentHour >= $start && $currentHour < $end;
    }

    private function isWithinFrequency(NotificationConfig $config, string $branchId): bool
    {
        $maxFreq = $config->max_frequency_minutes;
        if (!$maxFreq) return true;

        $lastLog = NotificationLog::where('branch_id', $branchId)
            ->where('channel', $config->channel)
            ->where('alert_type', $this->type)
            ->where('created_at', '>=', Carbon::now()->subMinutes($maxFreq))
            ->exists();

        return !$lastLog;
    }

    private function sendViaChannel(NotificationConfig $config, User $user): void
    {
        try {
            match ($config->channel) {
                'email' => $this->sendEmail($config, $user),
                'whatsapp' => $this->sendWhatsApp($config, $user),
                'dashboard' => $this->logDashboard($user),
                default => Log::warning("Unknown notification channel: {$config->channel}"),
            };
        } catch (\Exception $e) {
            Log::error("Failed to send notification via {$config->channel}: {$e->getMessage()}");

            // Log the failure
            $recipients = $config->recipients ?? [$user->email];
            foreach ($recipients as $recipient) {
                NotificationLog::create([
                    'alert_id' => $this->alertId,
                    'branch_id' => $this->branch->id,
                    'organization_id' => $this->branch->organization_id,
                    'channel' => $config->channel,
                    'recipient' => $recipient,
                    'alert_type' => $this->type,
                    'status' => 'failed',
                    'message' => $this->buildMessage(),
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    private function sendEmail(NotificationConfig $config, User $user): void
    {
        $recipients = $config->recipients ?? [$user->email];
        $subject = $this->buildSubject();
        $messageText = $this->buildMessage();

        foreach ($recipients as $email) {
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) continue;

            Mail::send('emails.alert-notification', [
                'type' => $this->type,
                'typeLabel' => $this->getTypeLabel(),
                'branch' => $this->branch,
                'data' => $this->data,
                'user' => $user,
                'messageText' => $messageText,
            ], function ($message) use ($email, $subject) {
                $message->to($email)->subject($subject);
            });

            NotificationLog::create([
                'alert_id' => $this->alertId,
                'branch_id' => $this->branch->id,
                'organization_id' => $this->branch->organization_id,
                'channel' => 'email',
                'recipient' => $email,
                'alert_type' => $this->type,
                'status' => 'sent',
                'message' => $messageText,
            ]);
        }
    }

    private function sendWhatsApp(NotificationConfig $config, User $user): void
    {
        $apiUrl = config('services.whatsapp.api_url');
        $apiToken = config('services.whatsapp.api_token');

        if (!$apiUrl || !$apiToken) {
            Log::warning('WhatsApp API not configured, skipping notification');
            return;
        }

        $recipients = $config->recipients ?? [];
        $messageText = $this->buildMessage();

        foreach ($recipients as $phone) {
            $phone = preg_replace('/\s+/', '', $phone);
            if (empty($phone)) continue;

            $response = Http::withToken($apiToken)->post($apiUrl . '/messages', [
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
                                ['type' => 'text', 'text' => $this->getTypeLabel()],
                                ['type' => 'text', 'text' => $this->branch->name],
                                ['type' => 'text', 'text' => $messageText],
                            ],
                        ],
                    ],
                ],
            ]);

            NotificationLog::create([
                'alert_id' => $this->alertId,
                'branch_id' => $this->branch->id,
                'organization_id' => $this->branch->organization_id,
                'channel' => 'whatsapp',
                'recipient' => $phone,
                'alert_type' => $this->type,
                'status' => $response->successful() ? 'sent' : 'failed',
                'message' => $messageText,
                'error' => $response->successful() ? null : $response->body(),
            ]);
        }
    }

    private function logDashboard(User $user): void
    {
        NotificationLog::create([
            'alert_id' => $this->alertId,
            'branch_id' => $this->branch->id,
            'organization_id' => $this->branch->organization_id,
            'channel' => 'dashboard',
            'recipient' => $user->email,
            'alert_type' => $this->type,
            'status' => 'sent',
            'message' => $this->buildMessage(),
        ]);
    }

    private function buildSubject(): string
    {
        $orgName = $this->branch->organization?->name ?? 'QualiMoji';
        return "{$orgName} - Alerte: {$this->getTypeLabel()} ({$this->branch->name})";
    }

    private function buildMessage(): string
    {
        return match ($this->type) {
            'negative_spike' => ($this->data['count'] ?? '?') . " avis negatifs en " . ($this->data['period'] ?? '24') . "h pour {$this->branch->name}",
            'satisfaction_drop' => "Chute de satisfaction pour {$this->branch->name}",
            'consecutive_negative' => ($this->data['count'] ?? 3) . " avis negatifs consecutifs pour {$this->branch->name}",
            'low_satisfaction' => "Satisfaction critique pour {$this->branch->name}",
            'inactivity' => "Aucune activite detectee pour {$this->branch->name}",
            default => "Alerte {$this->type} pour {$this->branch->name}",
        };
    }

    private function getTypeLabel(): string
    {
        return match ($this->type) {
            'negative_spike' => 'Pic negatif',
            'satisfaction_drop' => 'Chute satisfaction',
            'consecutive_negative' => 'Negatifs consecutifs',
            'low_satisfaction' => 'Satisfaction basse',
            'inactivity' => 'Inactivite',
            default => 'Alerte',
        };
    }
}
