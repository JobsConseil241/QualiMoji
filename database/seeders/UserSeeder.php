<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\UserRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $orgId = '00000000-0000-0000-0000-000000000001';

        $users = [
            [
                'name' => 'Admin QualiMoji',
                'full_name' => 'Admin QualiMoji',
                'email' => 'admin@qualimoji.com',
                'password' => Hash::make('password'),
                'organization_id' => $orgId,
                'is_active' => true,
                'role' => 'admin',
            ],
            [
                'name' => 'Sophie Laurent',
                'full_name' => 'Sophie Laurent',
                'email' => 'sophie.laurent@qualimoji.com',
                'password' => Hash::make('password'),
                'organization_id' => $orgId,
                'is_active' => true,
                'role' => 'quality_director',
            ],
            [
                'name' => 'Marc Dubois',
                'full_name' => 'Marc Dubois',
                'email' => 'marc.dubois@qualimoji.com',
                'password' => Hash::make('password'),
                'organization_id' => $orgId,
                'is_active' => true,
                'role' => 'branch_manager',
            ],
            [
                'name' => 'Julie Moreau',
                'full_name' => 'Julie Moreau',
                'email' => 'julie.moreau@qualimoji.com',
                'password' => Hash::make('password'),
                'organization_id' => $orgId,
                'is_active' => true,
                'role' => 'branch_manager',
            ],
            [
                'name' => 'Thomas Petit',
                'full_name' => 'Thomas Petit',
                'email' => 'thomas.petit@qualimoji.com',
                'password' => Hash::make('password'),
                'organization_id' => $orgId,
                'is_active' => true,
                'role' => 'it_admin',
            ],
        ];

        foreach ($users as $userData) {
            $role = $userData['role'];
            unset($userData['role']);

            $user = User::create($userData);

            UserRole::create([
                'user_id' => $user->id,
                'role' => $role,
            ]);
        }
    }
}
