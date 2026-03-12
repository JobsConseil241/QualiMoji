<?php

namespace Database\Seeders;

use App\Models\QuestionConfig;
use App\Models\User;
use Illuminate\Database\Seeder;

class QuestionConfigSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@qualimoji.com')->first();
        $orgId = '00000000-0000-0000-0000-000000000001';

        $configs = [
            [
                'sentiment' => 'very_happy',
                'emoji' => '😍',
                'label' => 'Très satisfait',
                'question' => 'Qu\'avez-vous le plus apprécié ?',
                'options' => json_encode(['Accueil chaleureux', 'Rapidité du service', 'Compétence du personnel', 'Environnement agréable']),
                'allow_free_text' => true,
                'is_active' => true,
                'sort_order' => 0,
            ],
            [
                'sentiment' => 'happy',
                'emoji' => '😊',
                'label' => 'Satisfait',
                'question' => 'Qu\'est-ce qui vous a plu ?',
                'options' => json_encode(['Accueil chaleureux', 'Rapidité du service', 'Compétence du personnel', 'Environnement agréable']),
                'allow_free_text' => true,
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'sentiment' => 'unhappy',
                'emoji' => '😕',
                'label' => 'Insatisfait',
                'question' => 'Comment pourrions-nous améliorer votre expérience ?',
                'options' => json_encode(['Réduire le temps d\'attente', 'Améliorer l\'accueil', 'Mieux informer', 'Moderniser les locaux']),
                'allow_free_text' => true,
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'sentiment' => 'very_unhappy',
                'emoji' => '😡',
                'label' => 'Très insatisfait',
                'question' => 'Quel a été le principal problème ?',
                'options' => json_encode(['Temps d\'attente trop long', 'Personnel désagréable', 'Problème non résolu', 'Manque d\'information', 'Environnement dégradé']),
                'allow_free_text' => true,
                'is_active' => true,
                'sort_order' => 3,
            ],
        ];

        foreach ($configs as $config) {
            QuestionConfig::create(array_merge($config, [
                'user_id' => $admin->id,
                'organization_id' => $orgId,
                'version' => 1,
            ]));
        }
    }
}
