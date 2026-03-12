<?php

namespace Database\Seeders;

use App\Models\ReportSchedule;
use App\Models\ReportHistory;
use App\Models\User;
use Illuminate\Database\Seeder;

class ReportSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@qualimoji.com')->first();
        $sophie = User::where('email', 'sophie.laurent@qualimoji.com')->first();

        // Weekly summary report
        $weeklySchedule = ReportSchedule::create([
            'user_id' => $admin->id,
            'name' => 'Rapport hebdomadaire global',
            'frequency' => 'weekly',
            'report_type' => 'summary',
            'recipients' => json_encode(['admin@qualimoji.com', 'sophie.laurent@qualimoji.com']),
            'is_active' => true,
            'include_global_metrics' => true,
            'include_branch_detail' => true,
            'include_charts' => true,
            'include_alerts' => true,
            'include_feedbacks' => false,
            'next_run_at' => '2026-03-10 08:00:00',
            'last_sent_at' => '2026-03-03 08:00:00',
        ]);

        // Monthly detailed report
        ReportSchedule::create([
            'user_id' => $sophie ? $sophie->id : $admin->id,
            'name' => 'Rapport mensuel détaillé',
            'frequency' => 'monthly',
            'report_type' => 'detailed',
            'recipients' => json_encode(['sophie.laurent@qualimoji.com', 'direction@qualimoji.com']),
            'is_active' => true,
            'include_global_metrics' => true,
            'include_branch_detail' => true,
            'include_charts' => true,
            'include_alerts' => true,
            'include_feedbacks' => true,
            'next_run_at' => '2026-04-01 08:00:00',
            'last_sent_at' => '2026-03-01 08:00:00',
        ]);

        // Daily executive report for Lille (problematic branch)
        ReportSchedule::create([
            'user_id' => $admin->id,
            'name' => 'Suivi quotidien Lille',
            'frequency' => 'daily',
            'report_type' => 'executive',
            'recipients' => json_encode(['admin@qualimoji.com', 'julie.moreau@qualimoji.com']),
            'is_active' => true,
            'include_branches' => json_encode(['10000000-0000-0000-0000-000000000005']),
            'include_sentiments' => json_encode(['negative', 'neutral']),
            'include_global_metrics' => false,
            'include_branch_detail' => true,
            'include_charts' => false,
            'include_alerts' => true,
            'include_feedbacks' => true,
            'next_run_at' => '2026-03-04 08:00:00',
            'last_sent_at' => '2026-03-03 08:00:00',
        ]);

        // Report history entries
        ReportHistory::create([
            'user_id' => $admin->id,
            'title' => 'Rapport hebdomadaire - Semaine 9',
            'report_type' => 'summary',
            'format' => 'pdf',
            'period_start' => '2026-02-24',
            'period_end' => '2026-03-02',
            'schedule_id' => $weeklySchedule->id,
            'sent_to' => json_encode(['admin@qualimoji.com', 'sophie.laurent@qualimoji.com']),
            'status' => 'sent',
            'created_at' => '2026-03-03 08:00:00',
        ]);

        ReportHistory::create([
            'user_id' => $admin->id,
            'title' => 'Rapport hebdomadaire - Semaine 8',
            'report_type' => 'summary',
            'format' => 'pdf',
            'period_start' => '2026-02-17',
            'period_end' => '2026-02-23',
            'schedule_id' => $weeklySchedule->id,
            'sent_to' => json_encode(['admin@qualimoji.com', 'sophie.laurent@qualimoji.com']),
            'status' => 'sent',
            'created_at' => '2026-02-24 08:00:00',
        ]);

        ReportHistory::create([
            'user_id' => $sophie ? $sophie->id : $admin->id,
            'title' => 'Export feedbacks négatifs Lille - Mars 2026',
            'report_type' => 'detailed',
            'format' => 'xlsx',
            'period_start' => '2026-03-01',
            'period_end' => '2026-03-03',
            'status' => 'generated',
            'created_at' => '2026-03-03 14:30:00',
        ]);
    }
}
