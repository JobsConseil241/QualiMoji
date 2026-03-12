<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class NotificationConfig extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'channel',
        'is_enabled',
        'recipients',
        'schedule_start',
        'schedule_end',
        'max_frequency_minutes',
    ];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'recipients' => 'array',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
