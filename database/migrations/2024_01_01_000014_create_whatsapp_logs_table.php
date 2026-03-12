<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('feedback_id')->nullable();
            $table->string('phone');
            $table->string('message_type');
            $table->string('sentiment')->nullable();
            $table->string('branch_name')->nullable();
            $table->string('status');
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->foreign('feedback_id')->references('id')->on('feedbacks')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_logs');
    }
};
