<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Alert extends Model
{
    use HasUuids;

    protected $fillable = [
        'branch_id',
        'branch_name',
        'type',
        'message',
        'status',
        'severity',
        'is_read',
        'resolution_note',
        'resolved_at',
        'resolved_by',
        'organization_id',
        'feedback_ids',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'resolved_at' => 'datetime',
            'feedback_ids' => 'array',
        ];
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function resolver()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
