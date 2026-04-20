<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->enum('questionnaire_mode', ['quadrimoji', 'open'])
                ->default('quadrimoji')
                ->after('kiosk_show_branch_name');
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn('questionnaire_mode');
        });
    }
};
