<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('full_name')->nullable()->after('name');
            $table->string('avatar_url')->nullable()->after('full_name');
            $table->uuid('organization_id')->nullable()->after('avatar_url');
            $table->boolean('is_active')->default(true)->after('organization_id');
            $table->timestamp('last_sign_in_at')->nullable()->after('is_active');

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->dropColumn(['full_name', 'avatar_url', 'organization_id', 'is_active', 'last_sign_in_at']);
        });
    }
};
