<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->string('name');
            $table->string('frequency');
            $table->string('report_type');
            $table->json('recipients');
            $table->boolean('is_active')->default(true);
            $table->json('include_branches')->nullable();
            $table->json('include_sentiments')->nullable();
            $table->boolean('include_global_metrics')->default(true);
            $table->boolean('include_branch_detail')->default(true);
            $table->boolean('include_charts')->default(false);
            $table->boolean('include_alerts')->default(true);
            $table->boolean('include_feedbacks')->default(true);
            $table->integer('custom_interval_days')->nullable();
            $table->timestamp('next_run_at')->nullable();
            $table->timestamp('last_sent_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_schedules');
    }
};
