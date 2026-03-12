<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class KioskConfig extends Model
{
    use HasUuids;

    protected $fillable = [
        'branch_id',
        'organization_id',
        'welcome_message',
        'start_button_text',
        'inactivity_timeout',
        'screensaver_delay',
        'auto_reset_delay',
        'screensaver_enabled',
        'sounds_enabled',
        'haptic_enabled',
        'offline_mode_enabled',
        'screensaver_slides',
        'message_templates',
    ];

    protected function casts(): array
    {
        return [
            'screensaver_enabled' => 'boolean',
            'sounds_enabled' => 'boolean',
            'haptic_enabled' => 'boolean',
            'offline_mode_enabled' => 'boolean',
            'screensaver_slides' => 'array',
            'message_templates' => 'array',
        ];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
