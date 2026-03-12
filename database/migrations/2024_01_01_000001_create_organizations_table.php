<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('logo_url')->nullable();
            $table->string('primary_color')->default('#1B4F72');
            $table->string('kiosk_logo_size')->default('medium');
            $table->string('kiosk_logo_position')->default('center');
            $table->boolean('kiosk_show_org_name')->default(true);
            $table->boolean('kiosk_show_branch_name')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
