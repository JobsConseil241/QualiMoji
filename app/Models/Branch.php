<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    use HasUuids;

    protected $fillable = [
        'organization_id',
        'name',
        'city',
        'address',
        'region',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function feedbacks()
    {
        return $this->hasMany(Feedback::class);
    }

    public function alerts()
    {
        return $this->hasMany(Alert::class);
    }

    public function userAssignments()
    {
        return $this->hasMany(UserBranchAssignment::class);
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'user_branch_assignments');
    }
}
