<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kpi_configs', function (Blueprint $table) {
            if (!Schema::hasColumn('kpi_configs', 'is_mandatory')) {
                $table->boolean('is_mandatory')->default(false)->after('config_value');
            }
            if (!Schema::hasColumn('kpi_configs', 'created_by')) {
                $table->unsignedBigInteger('created_by')->nullable()->after('is_mandatory');
                $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('kpi_configs', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropColumn(['is_mandatory', 'created_by']);
        });
    }
};
