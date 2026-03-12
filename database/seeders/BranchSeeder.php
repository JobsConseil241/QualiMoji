<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\UserBranchAssignment;
use App\Models\User;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    public function run(): void
    {
        $orgId = '00000000-0000-0000-0000-000000000001';

        $branches = [
            ['id' => '10000000-0000-0000-0000-000000000001', 'name' => 'Agence Paris Centre', 'city' => 'Paris', 'address' => '12 Rue de Rivoli, 75001 Paris', 'region' => 'Île-de-France'],
            ['id' => '10000000-0000-0000-0000-000000000002', 'name' => 'Agence Lyon Part-Dieu', 'city' => 'Lyon', 'address' => '45 Boulevard Vivier Merle, 69003 Lyon', 'region' => 'Auvergne-Rhône-Alpes'],
            ['id' => '10000000-0000-0000-0000-000000000003', 'name' => 'Agence Marseille Vieux-Port', 'city' => 'Marseille', 'address' => '8 Quai du Port, 13002 Marseille', 'region' => 'PACA'],
            ['id' => '10000000-0000-0000-0000-000000000004', 'name' => 'Agence Bordeaux Lac', 'city' => 'Bordeaux', 'address' => '23 Rue Sainte-Catherine, 33000 Bordeaux', 'region' => 'Nouvelle-Aquitaine'],
            ['id' => '10000000-0000-0000-0000-000000000005', 'name' => 'Agence Lille Europe', 'city' => 'Lille', 'address' => '1 Place de la Gare, 59000 Lille', 'region' => 'Hauts-de-France'],
            ['id' => '10000000-0000-0000-0000-000000000006', 'name' => 'Agence Nantes Atlantis', 'city' => 'Nantes', 'address' => '15 Allée des Tanneurs, 44000 Nantes', 'region' => 'Pays de la Loire'],
            ['id' => '10000000-0000-0000-0000-000000000007', 'name' => 'Agence Toulouse Capitole', 'city' => 'Toulouse', 'address' => '5 Place du Capitole, 31000 Toulouse', 'region' => 'Occitanie'],
            ['id' => '10000000-0000-0000-0000-000000000008', 'name' => 'Agence Strasbourg Gare', 'city' => 'Strasbourg', 'address' => '20 Place de la Gare, 67000 Strasbourg', 'region' => 'Grand Est'],
        ];

        foreach ($branches as $data) {
            Branch::create(array_merge($data, [
                'organization_id' => $orgId,
                'is_active' => true,
            ]));
        }

        // Assign branch managers to their branches
        $marc = User::where('email', 'marc.dubois@qualimoji.com')->first();
        $julie = User::where('email', 'julie.moreau@qualimoji.com')->first();

        if ($marc) {
            // Marc manages Paris, Lyon, Marseille, Bordeaux
            foreach (['10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004'] as $branchId) {
                UserBranchAssignment::create([
                    'user_id' => $marc->id,
                    'branch_id' => $branchId,
                ]);
            }
        }

        if ($julie) {
            // Julie manages Lille, Nantes, Toulouse, Strasbourg
            foreach (['10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000008'] as $branchId) {
                UserBranchAssignment::create([
                    'user_id' => $julie->id,
                    'branch_id' => $branchId,
                ]);
            }
        }
    }
}
