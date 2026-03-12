<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ReportHistory extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'title',
        'report_type',
        'format',
        'period_start',
        'period_end',
        'schedule_id',
        'sent_to',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'sent_to' => 'array',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function schedule()
    {
        return $this->belongsTo(ReportSchedule::class);
    }
}
