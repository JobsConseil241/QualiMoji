<?php

namespace App\Jobs;

use App\Models\ReportSchedule;
use App\Models\ReportHistory;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SendScheduledReports implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        $schedules = ReportSchedule::where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('next_run_at')
                  ->orWhere('next_run_at', '<=', now());
            })
            ->get();

        foreach ($schedules as $schedule) {
            try {
                $this->processSchedule($schedule);
            } catch (\Exception $e) {
                Log::error("Failed to process report schedule {$schedule->id}: {$e->getMessage()}");
            }
        }
    }

    private function processSchedule(ReportSchedule $schedule): void
    {
        $periodEnd = now();
        $periodStart = match ($schedule->frequency) {
            'daily' => $periodEnd->copy()->subDay(),
            'weekly' => $periodEnd->copy()->subWeek(),
            'monthly' => $periodEnd->copy()->subMonth(),
            'custom' => $periodEnd->copy()->subDays($schedule->custom_interval_days ?? 7),
            default => $periodEnd->copy()->subWeek(),
        };

        // Create history record
        $history = ReportHistory::create([
            'user_id' => $schedule->user_id,
            'title' => $schedule->name . ' - ' . $periodEnd->format('d/m/Y'),
            'report_type' => $schedule->report_type,
            'format' => 'email',
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd->toDateString(),
            'schedule_id' => $schedule->id,
            'sent_to' => $schedule->recipients,
            'status' => 'sent',
        ]);

        // Send emails to recipients
        foreach ($schedule->recipients as $email) {
            try {
                Mail::send('emails.alert-notification', [
                    'type' => 'scheduled_report',
                    'data' => [
                        'schedule_name' => $schedule->name,
                        'period_start' => $periodStart->format('d/m/Y'),
                        'period_end' => $periodEnd->format('d/m/Y'),
                    ],
                ], function ($message) use ($email, $schedule) {
                    $message->to($email)
                        ->subject("QualiMoji - Rapport: {$schedule->name}");
                });
            } catch (\Exception $e) {
                Log::error("Failed to send report email to {$email}: {$e->getMessage()}");
            }
        }

        // Update next run
        $nextRun = match ($schedule->frequency) {
            'daily' => now()->addDay(),
            'weekly' => now()->addWeek(),
            'monthly' => now()->addMonth(),
            'custom' => now()->addDays($schedule->custom_interval_days ?? 7),
            default => now()->addWeek(),
        };

        $schedule->update([
            'last_sent_at' => now(),
            'next_run_at' => $nextRun,
        ]);
    }
}
