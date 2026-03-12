<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Feedback extends Model
{
    use HasUuids;

    protected $table = 'feedbacks';

    protected $fillable = [
        'branch_id',
        'sentiment',
        'follow_up_responses',
        'customer_name',
        'customer_email',
        'customer_phone',
        'customer_notified',
        'wants_callback',
    ];

    protected function casts(): array
    {
        return [
            'follow_up_responses' => 'array',
            'customer_notified' => 'boolean',
            'wants_callback' => 'boolean',
        ];
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function whatsappLogs()
    {
        return $this->hasMany(WhatsappLog::class);
    }
}
