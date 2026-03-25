<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class KpiConfig extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'organization_id',
        'branch_id',
        'config_key',
        'config_value',
        'is_mandatory',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'config_value' => 'array',
            'is_mandatory' => 'boolean',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the effective config for a branch: branch-specific first, then org default.
     */
    public static function getEffective(string $organizationId, string $branchId, string $configKey): ?self
    {
        // Try branch-specific first
        $config = static::where('organization_id', $organizationId)
            ->where('branch_id', $branchId)
            ->where('config_key', $configKey)
            ->first();

        if ($config) return $config;

        // Fallback to org-level
        return static::where('organization_id', $organizationId)
            ->whereNull('branch_id')
            ->where('config_key', $configKey)
            ->first();
    }
}
