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

        $toOptions = function (array $labels): array {
            $out = [];
            foreach ($labels as $i => $label) {
                $out[] = [
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'label' => $label,
                    'order' => $i,
                ];
            }
            return $out;
        };

        $configs = [
            [
                'sentiment' => 'very_happy',
                'emoji' => '😍',
                'label' => 'Très satisfait',
                'question' => 'Qu\'avez-vous le plus apprécié ?',
                'options' => $toOptions(['Accueil chaleureux', 'Rapidité du service', 'Compétence du personnel', 'Environnement agréable']),
                'allow_free_text' => true,
                'is_active' => true,
                'sort_order' => 0,
            ],
            [
                'sentiment' => 'happy',
                'emoji' => '😊',
                'label' => 'Satisfait',
                'question' => 'Qu\'est-ce qui vous a plu ?',
                'options' => $toOptions(['Accueil chaleureux', 'Rapidité du service', 'Compétence du personnel', 'Environnement agréable']),
                'allow_free_text' => true,
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'sentiment' => 'neutral',
                'emoji' => '😐',
                'label' => 'Neutre',
                'question' => 'Quel est votre ressenti ?',
                'options' => $toOptions(['Service correct', 'Sans plus', 'Pourrait être mieux', 'Aucun avis particulier']),
                'allow_free_text' => true,
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'sentiment' => 'unhappy',
                'emoji' => '😕',
                'label' => 'Insatisfait',
                'question' => 'Comment pourrions-nous améliorer votre expérience ?',
                'options' => $toOptions(['Réduire le temps d\'attente', 'Améliorer l\'accueil', 'Mieux informer', 'Moderniser les locaux']),
                'allow_free_text' => true,
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'sentiment' => 'very_unhappy',
                'emoji' => '😡',
                'label' => 'Très insatisfait',
                'question' => 'Quel a été le principal problème ?',
                'options' => $toOptions(['Temps d\'attente trop long', 'Personnel désagréable', 'Problème non résolu', 'Manque d\'information', 'Environnement dégradé']),
                'allow_free_text' => true,
                'is_active' => true,
                'sort_order' => 4,
            ],
        ];

        foreach ($configs as $config) {
            QuestionConfig::updateOrCreate(
                [
                    'organization_id' => $orgId,
                    'branch_id' => null,
                    'sentiment' => $config['sentiment'],
                ],
                [
                    ...$config,
                    'user_id' => $admin->id,
                    'version' => 1,
                ]
            );
        }
    }
}
