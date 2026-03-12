<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Seeder;

class AuditLogSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@qualimoji.com')->first();
        $sophie = User::where('email', 'sophie.laurent@qualimoji.com')->first();

        $logs = [
            [
                'actor_id' => $admin->id,
                'actor_email' => 'admin@qualimoji.com',
                'action' => 'create',
                'target_type' => 'branch',
                'details' => json_encode(['name' => 'Agence Paris Centre', 'city' => 'Paris']),
                'created_at' => '2026-01-15 10:00:00',
            ],
            [
                'actor_id' => $admin->id,
                'actor_email' => 'admin@qualimoji.com',
                'action' => 'create',
                'target_type' => 'user',
                'details' => json_encode(['email' => 'sophie.laurent@qualimoji.com', 'role' => 'quality_director']),
                'created_at' => '2026-01-15 10:30:00',
            ],
            [
                'actor_id' => $admin->id,
                'actor_email' => 'admin@qualimoji.com',
                'action' => 'update',
                'target_type' => 'kiosk_config',
                'details' => json_encode(['change' => 'Updated welcome message']),
                'created_at' => '2026-02-01 09:00:00',
            ],
            [
                'actor_id' => $sophie ? $sophie->id : $admin->id,
                'actor_email' => $sophie ? 'sophie.laurent@qualimoji.com' : 'admin@qualimoji.com',
                'action' => 'update',
                'target_type' => 'kpi_config',
                'details' => json_encode(['change' => 'Adjusted dissatisfaction threshold to 30%']),
                'created_at' => '2026-02-15 14:00:00',
            ],
            [
                'actor_id' => $admin->id,
                'actor_email' => 'admin@qualimoji.com',
                'action' => 'create',
                'target_type' => 'report_schedule',
                'details' => json_encode(['name' => 'Rapport hebdomadaire global', 'frequency' => 'weekly']),
                'created_at' => '2026-02-20 11:00:00',
            ],
            [
                'actor_id' => $sophie ? $sophie->id : $admin->id,
                'actor_email' => $sophie ? 'sophie.laurent@qualimoji.com' : 'admin@qualimoji.com',
                'action' => 'update',
                'target_type' => 'alert',
                'details' => json_encode(['action' => 'Resolved alert for Paris Centre']),
                'created_at' => '2026-02-27 09:00:00',
            ],
            [
                'actor_id' => $admin->id,
                'actor_email' => 'admin@qualimoji.com',
                'action' => 'create',
                'target_type' => 'report_schedule',
                'details' => json_encode(['name' => 'Suivi quotidien Lille', 'frequency' => 'daily']),
                'created_at' => '2026-03-01 10:00:00',
            ],
        ];

        foreach ($logs as $log) {
            AuditLog::create($log);
        }
    }
}
