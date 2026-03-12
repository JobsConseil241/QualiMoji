<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ReportSchedule extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'name',
        'frequency',
        'report_type',
        'recipients',
        'is_active',
        'include_branches',
        'include_sentiments',
        'include_global_metrics',
        'include_branch_detail',
        'include_charts',
        'include_alerts',
        'include_feedbacks',
        'custom_interval_days',
        'next_run_at',
        'last_sent_at',
    ];

    protected function casts(): array
    {
        return [
            'recipients' => 'array',
            'is_active' => 'boolean',
            'include_branches' => 'array',
            'include_sentiments' => 'array',
            'include_global_metrics' => 'boolean',
            'include_branch_detail' => 'boolean',
            'include_charts' => 'boolean',
            'include_alerts' => 'boolean',
            'include_feedbacks' => 'boolean',
            'next_run_at' => 'datetime',
            'last_sent_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function histories()
    {
        return $this->hasMany(ReportHistory::class, 'schedule_id');
    }
}
