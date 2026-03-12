<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Convert old 3-level sentiments to 4-level system
        DB::table('feedbacks')->where('sentiment', 'positive')->update(['sentiment' => 'very_happy']);
        DB::table('feedbacks')->where('sentiment', 'negative')->update(['sentiment' => 'very_unhappy']);
        DB::table('feedbacks')->where('sentiment', 'neutral')->delete();
    }

    public function down(): void
    {
        // Cannot reverse deletion of neutral feedbacks
    }
};
