<?php

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\Organization;
use Illuminate\Database\Seeder;

class AlertSeeder extends Seeder
{
    public function run(): void
    {
        $orgId = '00000000-0000-0000-0000-000000000001';

        $alerts = [
            [
                'branch_id' => '10000000-0000-0000-0000-000000000005',
                'branch_name' => 'Agence Lille Europe',
                'type' => 'critical',
                'message' => 'Score de satisfaction en dessous du seuil critique (3.5)',
                'status' => 'active',
                'severity' => 'critical',
                'is_read' => false,
                'organization_id' => $orgId,
                'created_at' => '2026-03-03 09:15:00',
            ],
            [
                'branch_id' => '10000000-0000-0000-0000-000000000003',
                'branch_name' => 'Agence Marseille Vieux-Port',
                'type' => 'warning',
                'message' => 'Augmentation des retours négatifs sur le temps d\'attente',
                'status' => 'active',
                'severity' => 'warning',
                'is_read' => false,
                'organization_id' => $orgId,
                'created_at' => '2026-03-03 08:30:00',
            ],
            [
                'branch_id' => '10000000-0000-0000-0000-000000000004',
                'branch_name' => 'Agence Bordeaux Lac',
                'type' => 'warning',
                'message' => 'Baisse de 12% du score qualité ce mois',
                'status' => 'active',
                'severity' => 'warning',
                'is_read' => true,
                'organization_id' => $orgId,
                'created_at' => '2026-03-02 16:45:00',
            ],
            [
                'branch_id' => '10000000-0000-0000-0000-000000000002',
                'branch_name' => 'Agence Lyon Part-Dieu',
                'type' => 'info',
                'message' => 'Nouveau record de satisfaction atteint',
                'status' => 'active',
                'severity' => 'info',
                'is_read' => true,
                'organization_id' => $orgId,
                'created_at' => '2026-03-02 14:20:00',
            ],
            [
                'branch_id' => '10000000-0000-0000-0000-000000000005',
                'branch_name' => 'Agence Lille Europe',
                'type' => 'critical',
                'message' => '3 plaintes non traitées depuis plus de 48h',
                'status' => 'active',
                'severity' => 'critical',
                'is_read' => false,
                'organization_id' => $orgId,
                'created_at' => '2026-03-01 11:00:00',
            ],
            [
                'branch_id' => '10000000-0000-0000-0000-000000000008',
                'branch_name' => 'Agence Strasbourg Gare',
                'type' => 'warning',
                'message' => 'Taux de réponse en baisse (62%), objectif : 75%',
                'status' => 'active',
                'severity' => 'warning',
                'is_read' => false,
                'organization_id' => $orgId,
                'created_at' => '2026-02-28 10:00:00',
            ],
            [
                'branch_id' => '10000000-0000-0000-0000-000000000001',
                'branch_name' => 'Agence Paris Centre',
                'type' => 'info',
                'message' => 'Objectif mensuel de feedbacks atteint (300+)',
                'status' => 'resolved',
                'severity' => 'info',
                'is_read' => true,
                'resolution_note' => 'Félicitations à l\'équipe Paris Centre.',
                'resolved_at' => '2026-02-27 09:00:00',
                'organization_id' => $orgId,
                'created_at' => '2026-02-25 08:00:00',
            ],
        ];

        foreach ($alerts as $data) {
            Alert::create($data);
        }
    }
}
