<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kiosk_configs', function (Blueprint $table) {
            $table->string('footer_text')->nullable()->after('message_templates');
        });
    }

    public function down(): void
    {
        Schema::table('kiosk_configs', function (Blueprint $table) {
            $table->dropColumn('footer_text');
        });
    }
};
