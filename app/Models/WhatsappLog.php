<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class WhatsappLog extends Model
{
    use HasUuids;

    protected $fillable = [
        'feedback_id',
        'phone',
        'message_type',
        'sentiment',
        'branch_name',
        'status',
        'error_message',
    ];

    public function feedback()
    {
        return $this->belongsTo(Feedback::class);
    }
}
