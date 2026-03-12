<?php

namespace Database\Seeders;

use App\Models\NotificationConfig;
use App\Models\User;
use Illuminate\Database\Seeder;

class NotificationConfigSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@qualimoji.com')->first();
        $sophie = User::where('email', 'sophie.laurent@qualimoji.com')->first();

        // Admin: email + whatsapp notifications
        NotificationConfig::create([
            'user_id' => $admin->id,
            'channel' => 'email',
            'is_enabled' => true,
            'recipients' => json_encode(['admin@qualimoji.com']),
            'schedule_start' => 8,
            'schedule_end' => 20,
            'max_frequency_minutes' => 30,
        ]);

        NotificationConfig::create([
            'user_id' => $admin->id,
            'channel' => 'whatsapp',
            'is_enabled' => true,
            'recipients' => json_encode(['+33 6 00 00 00 01']),
            'schedule_start' => 9,
            'schedule_end' => 18,
            'max_frequency_minutes' => 60,
        ]);

        // Quality director: email only
        if ($sophie) {
            NotificationConfig::create([
                'user_id' => $sophie->id,
                'channel' => 'email',
                'is_enabled' => true,
                'recipients' => json_encode(['sophie.laurent@qualimoji.com']),
                'schedule_start' => 8,
                'schedule_end' => 19,
                'max_frequency_minutes' => 15,
            ]);
        }
    }
}
