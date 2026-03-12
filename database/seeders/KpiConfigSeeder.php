<?php

namespace Database\Seeders;

use App\Models\KpiConfig;
use App\Models\User;
use Illuminate\Database\Seeder;

class KpiConfigSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@qualimoji.com')->first();
        $orgId = '00000000-0000-0000-0000-000000000001';

        $configs = [
            [
                'config_key' => 'dissatisfaction_threshold',
                'config_value' => json_encode([
                    'enabled' => true,
                    'threshold' => 30,
                    'period_hours' => 24,
                    'description' => 'Alerte si le taux d\'insatisfaction dépasse 30% sur 24h',
                ]),
            ],
            [
                'config_key' => 'consecutive_negative',
                'config_value' => json_encode([
                    'enabled' => true,
                    'count' => 3,
                    'description' => 'Alerte après 3 retours négatifs consécutifs',
                ]),
            ],
            [
                'config_key' => 'min_satisfaction_score',
                'config_value' => json_encode([
                    'enabled' => true,
                    'threshold' => 3.5,
                    'description' => 'Alerte critique si le score moyen descend sous 3.5',
                ]),
            ],
            [
                'config_key' => 'response_rate_target',
                'config_value' => json_encode([
                    'enabled' => true,
                    'target' => 75,
                    'description' => 'Objectif de taux de réponse : 75%',
                ]),
            ],
        ];

        foreach ($configs as $config) {
            KpiConfig::create(array_merge($config, [
                'user_id' => $admin->id,
                'organization_id' => $orgId,
            ]));
        }
    }
}
