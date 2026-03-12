<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_histories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->string('title');
            $table->string('report_type');
            $table->string('format');
            $table->date('period_start');
            $table->date('period_end');
            $table->uuid('schedule_id')->nullable();
            $table->json('sent_to')->nullable();
            $table->string('status')->default('generated');
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('schedule_id')->references('id')->on('report_schedules')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_histories');
    }
};
