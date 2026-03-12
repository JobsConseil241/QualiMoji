<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class QuestionConfig extends Model
{
    use HasUuids;

    protected $attributes = [
        'options' => '[]',
    ];

    protected $fillable = [
        'organization_id',
        'branch_id',
        'user_id',
        'sentiment',
        'emoji',
        'label',
        'question',
        'options',
        'allow_free_text',
        'is_active',
        'sort_order',
        'version',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'allow_free_text' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
