<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Organization extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'logo_url',
        'primary_color',
        'kiosk_logo_size',
        'kiosk_logo_position',
        'kiosk_show_org_name',
        'kiosk_show_branch_name',
    ];

    protected function casts(): array
    {
        return [
            'kiosk_show_org_name' => 'boolean',
            'kiosk_show_branch_name' => 'boolean',
        ];
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function branches()
    {
        return $this->hasMany(Branch::class);
    }

    public function questionConfigs()
    {
        return $this->hasMany(QuestionConfig::class);
    }

    public function kioskConfigs()
    {
        return $this->hasMany(KioskConfig::class);
    }

    public function kpiConfigs()
    {
        return $this->hasMany(KpiConfig::class);
    }

    public function alerts()
    {
        return $this->hasMany(Alert::class);
    }
}
