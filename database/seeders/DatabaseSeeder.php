<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            OrganizationSeeder::class,
            UserSeeder::class,
            BranchSeeder::class,
            QuestionConfigSeeder::class,
            KioskConfigSeeder::class,
            KpiConfigSeeder::class,
            NotificationConfigSeeder::class,
            FeedbackSeeder::class,
            AlertSeeder::class,
            ReportSeeder::class,
            WhatsappLogSeeder::class,
            AuditLogSeeder::class,
        ]);
    }
}
