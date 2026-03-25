<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('alert_id')->nullable();
            $table->uuid('branch_id')->nullable();
            $table->uuid('organization_id');
            $table->string('channel'); // email, whatsapp, dashboard
            $table->string('recipient'); // email or phone
            $table->string('alert_type'); // negative_spike, etc.
            $table->string('status')->default('sent'); // sent, delivered, failed
            $table->text('message')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();

            $table->foreign('alert_id')->references('id')->on('alerts')->nullOnDelete();
            $table->foreign('branch_id')->references('id')->on('branches')->nullOnDelete();
            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();

            $table->index(['organization_id', 'created_at']);
            $table->index(['branch_id', 'channel', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_logs');
    }
};
