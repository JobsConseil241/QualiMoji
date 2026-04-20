<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('open_questions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->nullable();
            $table->string('branch_id')->nullable();
            $table->string('label');
            $table->enum('type', [
                'short_text',
                'long_text',
                'rating_1_5',
                'rating_1_10',
                'single_choice',
                'multi_choice',
            ]);
            $table->json('options')->nullable();
            $table->boolean('is_required')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->integer('version')->default(1);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('cascade');
            $table->index(['organization_id', 'branch_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('open_questions');
    }
};
