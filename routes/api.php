<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\FeedbackController;
use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\UserManagementController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\KioskController;
use App\Http\Controllers\Api\WhatsAppTemplateController;

// ── Public Auth Routes ──
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);

// ── Public Kiosk Routes ──
Route::prefix('kiosk')->group(function () {
    Route::get('/config/{branchId}', [KioskController::class, 'config']);
    Route::post('/feedback', [FeedbackController::class, 'store']);
});

// ── Authenticated Routes ──
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::put('/auth/password', [AuthController::class, 'updatePassword']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Branches
    Route::apiResource('branches', BranchController::class);

    // Feedbacks
    Route::get('/feedbacks/stats', [FeedbackController::class, 'stats']);
    Route::apiResource('feedbacks', FeedbackController::class)->only(['index', 'show', 'update']);

    // Alerts
    Route::get('/alerts/stats', [AlertController::class, 'stats']);
    Route::post('/alerts/mark-all-read', [AlertController::class, 'markAllAsRead']);
    Route::post('/alerts/{alert}/read', [AlertController::class, 'markAsRead']);
    Route::post('/alerts/{alert}/resolve', [AlertController::class, 'resolve']);
    Route::apiResource('alerts', AlertController::class)->only(['index', 'show']);

    // Settings
    Route::prefix('settings')->group(function () {
        Route::get('/questions', [SettingsController::class, 'getQuestionConfigs']);
        Route::post('/questions', [SettingsController::class, 'saveQuestionConfigs']);
        Route::get('/kiosk', [SettingsController::class, 'getKioskConfig']);
        Route::post('/kiosk', [SettingsController::class, 'saveKioskConfig']);
        Route::post('/kiosk/upload', [SettingsController::class, 'uploadKioskSlide']);
        Route::get('/kpi', [SettingsController::class, 'getKpiConfigs']);
        Route::post('/kpi', [SettingsController::class, 'saveKpiConfigs']);
        Route::get('/notifications', [SettingsController::class, 'getNotificationConfigs']);
        Route::post('/notifications', [SettingsController::class, 'saveNotificationConfigs']);
        Route::get('/organization', [SettingsController::class, 'getOrganization']);
        Route::put('/organization', [SettingsController::class, 'updateOrganization']);
        Route::post('/organization/logo', [SettingsController::class, 'uploadLogo']);
        Route::get('/users', [UserManagementController::class, 'index']);
        Route::post('/users/invite', [UserManagementController::class, 'store']);
        Route::put('/users/{user}', [UserManagementController::class, 'update']);
        Route::get('/audit-logs', [SettingsController::class, 'getAuditLogs']);
    });

    // WhatsApp Templates
    Route::get('/whatsapp/templates', [WhatsAppTemplateController::class, 'index']);
    Route::post('/whatsapp/templates', [WhatsAppTemplateController::class, 'saveTemplates']);
    Route::post('/whatsapp/test', [WhatsAppTemplateController::class, 'sendTest']);
    Route::get('/whatsapp/logs', [WhatsAppTemplateController::class, 'logs']);

    // Reports
    Route::prefix('reports')->group(function () {
        Route::get('/schedules', [ReportController::class, 'indexSchedules']);
        Route::post('/schedules', [ReportController::class, 'storeSchedule']);
        Route::put('/schedules/{schedule}', [ReportController::class, 'updateSchedule']);
        Route::delete('/schedules/{schedule}', [ReportController::class, 'destroySchedule']);
        Route::get('/history', [ReportController::class, 'indexHistory']);
        Route::post('/history', [ReportController::class, 'storeHistory']);
    });

    // User Management (admin only)
    Route::middleware('role:admin')->group(function () {
        Route::apiResource('users', UserManagementController::class);
    });
});
