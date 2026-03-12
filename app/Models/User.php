<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'full_name',
        'avatar_url',
        'organization_id',
        'is_active',
        'last_sign_in_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = ['role'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_sign_in_at' => 'datetime',
        ];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function userRole()
    {
        return $this->hasOne(UserRole::class);
    }

    public function branchAssignments()
    {
        return $this->hasMany(UserBranchAssignment::class);
    }

    public function branches()
    {
        return $this->belongsToMany(Branch::class, 'user_branch_assignments');
    }

    public function questionConfigs()
    {
        return $this->hasMany(QuestionConfig::class);
    }

    public function kpiConfigs()
    {
        return $this->hasMany(KpiConfig::class);
    }

    public function notificationConfigs()
    {
        return $this->hasMany(NotificationConfig::class);
    }

    public function reportSchedules()
    {
        return $this->hasMany(ReportSchedule::class);
    }

    public function reportHistories()
    {
        return $this->hasMany(ReportHistory::class);
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class, 'actor_id');
    }

    public function getRoleAttribute()
    {
        return $this->userRole?->role;
    }

    public function hasRole(string $role): bool
    {
        return $this->userRole?->role === $role;
    }
}
