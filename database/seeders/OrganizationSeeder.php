<?php

namespace Database\Seeders;

use App\Models\Organization;
use Illuminate\Database\Seeder;

class OrganizationSeeder extends Seeder
{
    public function run(): void
    {
        Organization::create([
            'id' => '00000000-0000-0000-0000-000000000001',
            'name' => 'QualiMoji Demo',
            'primary_color' => '#1B4F72',
            'kiosk_logo_size' => 'medium',
            'kiosk_logo_position' => 'center',
            'kiosk_show_org_name' => true,
            'kiosk_show_branch_name' => true,
        ]);
    }
}
