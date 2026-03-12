<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('question_configs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->nullable();
            $table->string('branch_id')->nullable();
            $table->unsignedBigInteger('user_id');
            $table->string('sentiment');
            $table->string('emoji')->default('🙂');
            $table->string('label')->default('');
            $table->string('question')->default('');
            $table->json('options')->nullable();
            $table->boolean('allow_free_text')->default(true);
            $table->boolean('is_active')->default(true);
            $table->integer('version')->default(1);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_configs');
    }
};
