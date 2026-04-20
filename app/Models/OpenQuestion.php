<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class OpenQuestion extends Model
{
    use HasUuids;

    protected $fillable = [
        'organization_id',
        'branch_id',
        'label',
        'type',
        'options',
        'is_required',
        'is_active',
        'sort_order',
        'version',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'is_required' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
