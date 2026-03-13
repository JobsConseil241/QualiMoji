<?php

namespace Database\Seeders;

use App\Models\Feedback;
use Illuminate\Database\Seeder;

class FeedbackSeeder extends Seeder
{
    public function run(): void
    {
        $branchIds = [
            'paris' => '10000000-0000-0000-0000-000000000001',
            'lyon' => '10000000-0000-0000-0000-000000000002',
            'marseille' => '10000000-0000-0000-0000-000000000003',
            'bordeaux' => '10000000-0000-0000-0000-000000000004',
            'lille' => '10000000-0000-0000-0000-000000000005',
            'nantes' => '10000000-0000-0000-0000-000000000006',
            'toulouse' => '10000000-0000-0000-0000-000000000007',
            'strasbourg' => '10000000-0000-0000-0000-000000000008',
        ];

        $feedbacks = [
            // Paris Centre - mostly positive
            ['branch_id' => $branchIds['paris'], 'sentiment' => 'very_happy', 'customer_name' => 'Marie Dupont', 'customer_email' => 'marie.d@email.com', 'follow_up_responses' => json_encode(['freeText' => 'Excellent accueil, très professionnel. Le conseiller a pris le temps de m\'expliquer toutes les options.', 'selectedOptions' => ['Accueil chaleureux', 'Compétence du personnel']]), 'created_at' => '2026-03-03 10:00:00'],
            ['branch_id' => $branchIds['paris'], 'sentiment' => 'happy', 'customer_name' => 'Claire Fontaine', 'follow_up_responses' => json_encode(['freeText' => 'Rapidité du service appréciable. Petit bémol sur l\'espace d\'attente.', 'selectedOptions' => ['Rapidité du service']]), 'created_at' => '2026-03-02 09:15:00'],
            ['branch_id' => $branchIds['paris'], 'sentiment' => 'very_happy', 'follow_up_responses' => json_encode(['freeText' => 'Très bonne expérience, je reviendrai.', 'selectedOptions' => ['Environnement agréable']]), 'created_at' => '2026-03-01 14:30:00'],
            ['branch_id' => $branchIds['paris'], 'sentiment' => 'happy', 'customer_name' => 'Antoine Lefevre', 'follow_up_responses' => json_encode(['freeText' => 'Service correct, rien à signaler.', 'selectedOptions' => ['Rapidité du service']]), 'created_at' => '2026-02-28 11:00:00'],
            ['branch_id' => $branchIds['paris'], 'sentiment' => 'very_happy', 'follow_up_responses' => json_encode(['freeText' => 'Personnel souriant et efficace.', 'selectedOptions' => ['Compétence du personnel', 'Accueil chaleureux']]), 'created_at' => '2026-02-27 16:45:00'],

            // Lyon Part-Dieu - positive
            ['branch_id' => $branchIds['lyon'], 'sentiment' => 'very_happy', 'follow_up_responses' => json_encode(['freeText' => 'Bon service, personnel aimable et compétent.', 'selectedOptions' => ['Compétence du personnel']]), 'created_at' => '2026-03-02 15:00:00'],
            ['branch_id' => $branchIds['lyon'], 'sentiment' => 'very_happy', 'customer_name' => 'Luc Bernard', 'customer_email' => 'luc.b@email.com', 'follow_up_responses' => json_encode(['freeText' => 'Accueil chaleureux, dossier traité en un temps record.', 'selectedOptions' => ['Accueil chaleureux', 'Rapidité du service']]), 'created_at' => '2026-03-01 10:00:00'],
            ['branch_id' => $branchIds['lyon'], 'sentiment' => 'happy', 'follow_up_responses' => json_encode(['freeText' => 'Équipe très professionnelle.', 'selectedOptions' => ['Compétence du personnel']]), 'created_at' => '2026-02-28 09:00:00'],
            ['branch_id' => $branchIds['lyon'], 'sentiment' => 'unhappy', 'customer_name' => 'Émilie Roux', 'follow_up_responses' => json_encode(['freeText' => 'Attente un peu longue mais service de qualité.', 'selectedOptions' => ['Temps d\'attente trop long']]), 'created_at' => '2026-02-26 13:30:00'],

            // Marseille Vieux-Port - mixed
            ['branch_id' => $branchIds['marseille'], 'sentiment' => 'very_unhappy', 'customer_name' => 'Pierre Martin', 'customer_phone' => '06 12 34 56 78', 'follow_up_responses' => json_encode(['freeText' => 'Temps d\'attente beaucoup trop long, plus de 45 minutes avant d\'être reçu.', 'selectedOptions' => ['Temps d\'attente trop long']]), 'wants_callback' => true, 'created_at' => '2026-03-03 09:30:00'],
            ['branch_id' => $branchIds['marseille'], 'sentiment' => 'unhappy', 'follow_up_responses' => json_encode(['freeText' => 'La signalétique est confuse, difficile de trouver le bon guichet.', 'selectedOptions' => ['Manque d\'information']]), 'created_at' => '2026-02-28 14:20:00'],
            ['branch_id' => $branchIds['marseille'], 'sentiment' => 'very_unhappy', 'customer_name' => 'Hassan Belhaj', 'follow_up_responses' => json_encode(['freeText' => 'Personne ne semblait savoir où m\'orienter.', 'selectedOptions' => ['Problème non résolu', 'Manque d\'information']]), 'created_at' => '2026-02-27 10:45:00'],
            ['branch_id' => $branchIds['marseille'], 'sentiment' => 'happy', 'follow_up_responses' => json_encode(['freeText' => 'Finalement bien pris en charge après l\'attente.', 'selectedOptions' => ['Compétence du personnel']]), 'created_at' => '2026-02-25 15:00:00'],

            // Bordeaux Lac - declining
            ['branch_id' => $branchIds['bordeaux'], 'sentiment' => 'unhappy', 'customer_name' => 'Sophie Blanc', 'follow_up_responses' => json_encode(['freeText' => 'Service correct mais rien d\'exceptionnel. Manque de proactivité.', 'selectedOptions' => ['Manque d\'information']]), 'created_at' => '2026-03-01 16:30:00'],
            ['branch_id' => $branchIds['bordeaux'], 'sentiment' => 'very_unhappy', 'follow_up_responses' => json_encode(['freeText' => 'Le conseiller ne connaissait pas les produits.', 'selectedOptions' => ['Problème non résolu']]), 'created_at' => '2026-02-28 11:15:00'],
            ['branch_id' => $branchIds['bordeaux'], 'sentiment' => 'unhappy', 'customer_name' => 'François Girard', 'follow_up_responses' => json_encode(['freeText' => 'Moyen, on peut mieux faire.', 'selectedOptions' => ['Améliorer l\'accueil']]), 'created_at' => '2026-02-26 14:00:00'],

            // Lille Europe - problematic
            ['branch_id' => $branchIds['lille'], 'sentiment' => 'very_unhappy', 'customer_name' => 'Jean Leclerc', 'customer_email' => 'j.leclerc@email.com', 'customer_phone' => '06 98 76 54 32', 'follow_up_responses' => json_encode(['freeText' => 'Aucune prise en charge de ma demande. Renvoyé de guichet en guichet sans solution.', 'selectedOptions' => ['Problème non résolu', 'Personnel désagréable']]), 'wants_callback' => true, 'created_at' => '2026-03-02 12:00:00'],
            ['branch_id' => $branchIds['lille'], 'sentiment' => 'very_unhappy', 'follow_up_responses' => json_encode(['freeText' => 'Personnel désagréable et peu disponible.', 'selectedOptions' => ['Personnel désagréable']]), 'created_at' => '2026-03-01 11:45:00'],
            ['branch_id' => $branchIds['lille'], 'sentiment' => 'very_unhappy', 'customer_name' => 'Nathalie Dupuis', 'follow_up_responses' => json_encode(['freeText' => 'Très déçue, aucune empathie de la part du personnel.', 'selectedOptions' => ['Personnel désagréable']]), 'wants_callback' => true, 'created_at' => '2026-02-28 16:00:00'],
            ['branch_id' => $branchIds['lille'], 'sentiment' => 'unhappy', 'follow_up_responses' => json_encode(['freeText' => 'Bof, l\'agence mériterait un coup de neuf.', 'selectedOptions' => ['Environnement dégradé']]), 'created_at' => '2026-02-27 09:30:00'],
            ['branch_id' => $branchIds['lille'], 'sentiment' => 'very_unhappy', 'follow_up_responses' => json_encode(['freeText' => 'Attente interminable et pas d\'excuses.', 'selectedOptions' => ['Temps d\'attente trop long']]), 'created_at' => '2026-02-25 14:00:00'],

            // Nantes Atlantis - good
            ['branch_id' => $branchIds['nantes'], 'sentiment' => 'very_happy', 'customer_name' => 'Claire Moreau', 'customer_email' => 'c.moreau@email.com', 'follow_up_responses' => json_encode(['freeText' => 'Parfait du début à la fin. Je recommande vivement cette agence.', 'selectedOptions' => ['Accueil chaleureux', 'Compétence du personnel']]), 'created_at' => '2026-02-28 09:00:00'],
            ['branch_id' => $branchIds['nantes'], 'sentiment' => 'very_happy', 'follow_up_responses' => json_encode(['freeText' => 'Excellent conseiller, très à l\'écoute.', 'selectedOptions' => ['Compétence du personnel']]), 'created_at' => '2026-02-27 11:00:00'],
            ['branch_id' => $branchIds['nantes'], 'sentiment' => 'happy', 'customer_name' => 'Philippe Mercier', 'follow_up_responses' => json_encode(['freeText' => 'Rapide et efficace, bravo.', 'selectedOptions' => ['Rapidité du service']]), 'created_at' => '2026-02-26 15:30:00'],

            // Toulouse Capitole - average
            ['branch_id' => $branchIds['toulouse'], 'sentiment' => 'happy', 'follow_up_responses' => json_encode(['freeText' => 'Bonne prise en charge, merci.', 'selectedOptions' => ['Compétence du personnel']]), 'created_at' => '2026-03-01 10:30:00'],
            ['branch_id' => $branchIds['toulouse'], 'sentiment' => 'unhappy', 'customer_name' => 'Isabelle Perrin', 'follow_up_responses' => json_encode(['freeText' => 'Correct sans plus. L\'accueil pourrait être plus chaleureux.', 'selectedOptions' => ['Améliorer l\'accueil']]), 'created_at' => '2026-02-27 14:15:00'],
            ['branch_id' => $branchIds['toulouse'], 'sentiment' => 'very_happy', 'follow_up_responses' => json_encode(['freeText' => 'Satisfaite du traitement de mon dossier.', 'selectedOptions' => ['Rapidité du service']]), 'created_at' => '2026-02-25 09:45:00'],

            // Strasbourg Gare - below average
            ['branch_id' => $branchIds['strasbourg'], 'sentiment' => 'unhappy', 'follow_up_responses' => json_encode(['freeText' => 'Ambiance froide, mais le travail est fait.', 'selectedOptions' => ['Environnement dégradé']]), 'created_at' => '2026-03-02 11:00:00'],
            ['branch_id' => $branchIds['strasbourg'], 'sentiment' => 'very_unhappy', 'customer_name' => 'Robert Wagner', 'follow_up_responses' => json_encode(['freeText' => 'Horaires non respectés, agence fermée à l\'heure prévue.', 'selectedOptions' => ['Problème non résolu']]), 'created_at' => '2026-02-28 17:30:00'],
            ['branch_id' => $branchIds['strasbourg'], 'sentiment' => 'happy', 'follow_up_responses' => json_encode(['freeText' => 'Bonne surprise, le nouveau conseiller est top.', 'selectedOptions' => ['Compétence du personnel', 'Accueil chaleureux']]), 'created_at' => '2026-02-26 10:00:00'],
        ];

        foreach ($feedbacks as $data) {
            Feedback::create(array_merge([
                'customer_notified' => false,
                'wants_callback' => false,
            ], $data));
        }
    }
}
