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
    ];

    protected function casts(): array
    {
        return [
            'config_value' => 'array',
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
}
