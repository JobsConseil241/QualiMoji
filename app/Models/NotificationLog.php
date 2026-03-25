<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class NotificationLog extends Model
{
    use HasUuids;

    protected $fillable = [
        'alert_id',
        'branch_id',
        'organization_id',
        'channel',
        'recipient',
        'alert_type',
        'status',
        'message',
        'error',
    ];

    public function alert()
    {
        return $this->belongsTo(Alert::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
