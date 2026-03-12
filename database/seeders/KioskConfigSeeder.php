<?php

namespace Database\Seeders;

use App\Models\KioskConfig;
use Illuminate\Database\Seeder;

class KioskConfigSeeder extends Seeder
{
    public function run(): void
    {
        $orgId = '00000000-0000-0000-0000-000000000001';

        // Global kiosk config for the organization
        KioskConfig::create([
            'organization_id' => $orgId,
            'branch_id' => null,
            'welcome_message' => 'Comment était votre expérience ?',
            'start_button_text' => 'Donner mon avis',
            'inactivity_timeout' => 30,
            'screensaver_delay' => 60,
            'auto_reset_delay' => 8,
            'screensaver_enabled' => true,
            'sounds_enabled' => false,
            'haptic_enabled' => false,
            'offline_mode_enabled' => true,
            'message_templates' => json_encode([
                'positive' => 'Merci pour votre retour positif ! Nous sommes ravis que votre expérience ait été satisfaisante.',
                'neutral' => 'Merci pour votre avis. Nous travaillons continuellement à améliorer nos services.',
                'negative' => 'Nous sommes désolés pour cette expérience. Un responsable vous contactera dans les plus brefs délais.',
            ]),
        ]);

        // Branch-specific override for Lille (problematic branch)
        KioskConfig::create([
            'organization_id' => $orgId,
            'branch_id' => '10000000-0000-0000-0000-000000000005',
            'welcome_message' => 'Votre avis nous aide à nous améliorer !',
            'start_button_text' => 'Donner mon avis',
            'inactivity_timeout' => 20,
            'screensaver_delay' => 45,
            'auto_reset_delay' => 6,
            'screensaver_enabled' => true,
            'sounds_enabled' => true,
            'haptic_enabled' => false,
            'offline_mode_enabled' => true,
            'message_templates' => json_encode([
                'positive' => 'Merci beaucoup ! Votre satisfaction est notre priorité.',
                'neutral' => 'Merci pour votre retour. Nous allons en tenir compte.',
                'negative' => 'Nous sommes sincèrement désolés. Un manager va vous rappeler très rapidement.',
            ]),
        ]);
    }
}
