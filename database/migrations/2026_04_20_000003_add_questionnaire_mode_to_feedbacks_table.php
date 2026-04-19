<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('feedbacks', function (Blueprint $table) {
            $table->enum('questionnaire_mode', ['quadrimoji', 'open'])
                ->default('quadrimoji')
                ->after('sentiment');
        });

        DB::table('feedbacks')
            ->whereNull('questionnaire_mode')
            ->update(['questionnaire_mode' => 'quadrimoji']);
    }

    public function down(): void
    {
        Schema::table('feedbacks', function (Blueprint $table) {
            $table->dropColumn('questionnaire_mode');
        });
    }
};
