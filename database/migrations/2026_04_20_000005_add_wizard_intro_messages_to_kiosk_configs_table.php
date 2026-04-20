<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kiosk_configs', function (Blueprint $table) {
            $table->json('wizard_intro_messages')->nullable()->after('message_templates');
        });
    }

    public function down(): void
    {
        Schema::table('kiosk_configs', function (Blueprint $table) {
            $table->dropColumn('wizard_intro_messages');
        });
    }
};
