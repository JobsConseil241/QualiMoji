<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kiosk_configs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('branch_id')->nullable();
            $table->uuid('organization_id')->nullable();
            $table->string('welcome_message')->default('Comment était votre expérience ?');
            $table->string('start_button_text')->default('Donner mon avis');
            $table->integer('inactivity_timeout')->default(30);
            $table->integer('screensaver_delay')->default(60);
            $table->integer('auto_reset_delay')->default(8);
            $table->boolean('screensaver_enabled')->default(true);
            $table->boolean('sounds_enabled')->default(false);
            $table->boolean('haptic_enabled')->default(false);
            $table->boolean('offline_mode_enabled')->default(true);
            $table->json('screensaver_slides')->nullable();
            $table->json('message_templates')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kiosk_configs');
    }
};
