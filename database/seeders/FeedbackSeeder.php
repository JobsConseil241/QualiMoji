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
            ['branch_id' => $branchIds['paris'], 'sentiment' => 'positive', 'customer_name' => 'Marie Dupont', 'customer_email' => 'marie.d@email.com', 'follow_up_responses' => json_encode(['comment' => 'Excellent accueil, très professionnel. Le conseiller a pris le temps de m\'expliquer toutes les options.', 'category' => 'Accueil']), 'created_at' => '2026-03-03 10:00:00'],
            ['branch_id' => $branchIds['paris'], 'sentiment' => 'positive', 'customer_name' => 'Claire Fontaine', 'follow_up_responses' => json_encode(['comment' => 'Rapidité du service appréciable. Petit bémol sur l\'espace d\'attente.', 'category' => 'Accueil']), 'created_at' => '2026-03-02 09:15:00'],
            ['branch_id' => $branchIds['paris'], 'sentiment' => 'positive', 'follow_up_responses' => json_encode(['comment' => 'Très bonne expérience, je reviendrai.', 'category' => 'Service']), 'created_at' => '2026-03-01 14:30:00'],
            ['branch_id' => $branchIds['paris'], 'sentiment' => 'neutral', 'customer_name' => 'Antoine Lefevre', 'follow_up_responses' => json_encode(['comment' => 'Service correct, rien à signaler.', 'category' => 'Service']), 'created_at' => '2026-02-28 11:00:00'],
            ['branch_id' => $branchIds['paris'], 'sentiment' => 'positive', 'follow_up_responses' => json_encode(['comment' => 'Personnel souriant et efficace.', 'category' => 'Personnel']), 'created_at' => '2026-02-27 16:45:00'],

            // Lyon Part-Dieu - positive
            ['branch_id' => $branchIds['lyon'], 'sentiment' => 'positive', 'follow_up_responses' => json_encode(['comment' => 'Bon service, personnel aimable et compétent.', 'category' => 'Service']), 'created_at' => '2026-03-02 15:00:00'],
            ['branch_id' => $branchIds['lyon'], 'sentiment' => 'positive', 'customer_name' => 'Luc Bernard', 'customer_email' => 'luc.b@email.com', 'follow_up_responses' => json_encode(['comment' => 'Accueil chaleureux, dossier traité en un temps record.', 'category' => 'Accueil']), 'created_at' => '2026-03-01 10:00:00'],
            ['branch_id' => $branchIds['lyon'], 'sentiment' => 'positive', 'follow_up_responses' => json_encode(['comment' => 'Équipe très professionnelle.', 'category' => 'Personnel']), 'created_at' => '2026-02-28 09:00:00'],
            ['branch_id' => $branchIds['lyon'], 'sentiment' => 'neutral', 'customer_name' => 'Émilie Roux', 'follow_up_responses' => json_encode(['comment' => 'Attente un peu longue mais service de qualité.', 'category' => 'Temps d\'attente']), 'created_at' => '2026-02-26 13:30:00'],

            // Marseille Vieux-Port - mixed
            ['branch_id' => $branchIds['marseille'], 'sentiment' => 'negative', 'customer_name' => 'Pierre Martin', 'customer_phone' => '06 12 34 56 78', 'follow_up_responses' => json_encode(['comment' => 'Temps d\'attente beaucoup trop long, plus de 45 minutes avant d\'être reçu.', 'category' => 'Temps d\'attente']), 'wants_callback' => true, 'created_at' => '2026-03-03 09:30:00'],
            ['branch_id' => $branchIds['marseille'], 'sentiment' => 'neutral', 'follow_up_responses' => json_encode(['comment' => 'La signalétique est confuse, difficile de trouver le bon guichet.', 'category' => 'Environnement']), 'created_at' => '2026-02-28 14:20:00'],
            ['branch_id' => $branchIds['marseille'], 'sentiment' => 'negative', 'customer_name' => 'Hassan Belhaj', 'follow_up_responses' => json_encode(['comment' => 'Personne ne semblait savoir où m\'orienter.', 'category' => 'Service']), 'created_at' => '2026-02-27 10:45:00'],
            ['branch_id' => $branchIds['marseille'], 'sentiment' => 'positive', 'follow_up_responses' => json_encode(['comment' => 'Finalement bien pris en charge après l\'attente.', 'category' => 'Service']), 'created_at' => '2026-02-25 15:00:00'],

            // Bordeaux Lac - declining
            ['branch_id' => $branchIds['bordeaux'], 'sentiment' => 'neutral', 'customer_name' => 'Sophie Blanc', 'follow_up_responses' => json_encode(['comment' => 'Service correct mais rien d\'exceptionnel. Manque de proactivité.', 'category' => 'Service']), 'created_at' => '2026-03-01 16:30:00'],
            ['branch_id' => $branchIds['bordeaux'], 'sentiment' => 'negative', 'follow_up_responses' => json_encode(['comment' => 'Le conseiller ne connaissait pas les produits.', 'category' => 'Personnel']), 'created_at' => '2026-02-28 11:15:00'],
            ['branch_id' => $branchIds['bordeaux'], 'sentiment' => 'neutral', 'customer_name' => 'François Girard', 'follow_up_responses' => json_encode(['comment' => 'Moyen, on peut mieux faire.', 'category' => 'Service']), 'created_at' => '2026-02-26 14:00:00'],

            // Lille Europe - problematic
            ['branch_id' => $branchIds['lille'], 'sentiment' => 'negative', 'customer_name' => 'Jean Leclerc', 'customer_email' => 'j.leclerc@email.com', 'customer_phone' => '06 98 76 54 32', 'follow_up_responses' => json_encode(['comment' => 'Aucune prise en charge de ma demande. Renvoyé de guichet en guichet sans solution.', 'category' => 'Service']), 'wants_callback' => true, 'created_at' => '2026-03-02 12:00:00'],
            ['branch_id' => $branchIds['lille'], 'sentiment' => 'negative', 'follow_up_responses' => json_encode(['comment' => 'Personnel désagréable et peu disponible.', 'category' => 'Personnel']), 'created_at' => '2026-03-01 11:45:00'],
            ['branch_id' => $branchIds['lille'], 'sentiment' => 'negative', 'customer_name' => 'Nathalie Dupuis', 'follow_up_responses' => json_encode(['comment' => 'Très déçue, aucune empathie de la part du personnel.', 'category' => 'Personnel']), 'wants_callback' => true, 'created_at' => '2026-02-28 16:00:00'],
            ['branch_id' => $branchIds['lille'], 'sentiment' => 'neutral', 'follow_up_responses' => json_encode(['comment' => 'Bof, l\'agence mériterait un coup de neuf.', 'category' => 'Environnement']), 'created_at' => '2026-02-27 09:30:00'],
            ['branch_id' => $branchIds['lille'], 'sentiment' => 'negative', 'follow_up_responses' => json_encode(['comment' => 'Attente interminable et pas d\'excuses.', 'category' => 'Temps d\'attente']), 'created_at' => '2026-02-25 14:00:00'],

            // Nantes Atlantis - good
            ['branch_id' => $branchIds['nantes'], 'sentiment' => 'positive', 'customer_name' => 'Claire Moreau', 'customer_email' => 'c.moreau@email.com', 'follow_up_responses' => json_encode(['comment' => 'Parfait du début à la fin. Je recommande vivement cette agence.', 'category' => 'Accueil']), 'created_at' => '2026-02-28 09:00:00'],
            ['branch_id' => $branchIds['nantes'], 'sentiment' => 'positive', 'follow_up_responses' => json_encode(['comment' => 'Excellent conseiller, très à l\'écoute.', 'category' => 'Personnel']), 'created_at' => '2026-02-27 11:00:00'],
            ['branch_id' => $branchIds['nantes'], 'sentiment' => 'positive', 'customer_name' => 'Philippe Mercier', 'follow_up_responses' => json_encode(['comment' => 'Rapide et efficace, bravo.', 'category' => 'Service']), 'created_at' => '2026-02-26 15:30:00'],

            // Toulouse Capitole - average
            ['branch_id' => $branchIds['toulouse'], 'sentiment' => 'positive', 'follow_up_responses' => json_encode(['comment' => 'Bonne prise en charge, merci.', 'category' => 'Service']), 'created_at' => '2026-03-01 10:30:00'],
            ['branch_id' => $branchIds['toulouse'], 'sentiment' => 'neutral', 'customer_name' => 'Isabelle Perrin', 'follow_up_responses' => json_encode(['comment' => 'Correct sans plus. L\'accueil pourrait être plus chaleureux.', 'category' => 'Accueil']), 'created_at' => '2026-02-27 14:15:00'],
            ['branch_id' => $branchIds['toulouse'], 'sentiment' => 'positive', 'follow_up_responses' => json_encode(['comment' => 'Satisfaite du traitement de mon dossier.', 'category' => 'Service']), 'created_at' => '2026-02-25 09:45:00'],

            // Strasbourg Gare - below average
            ['branch_id' => $branchIds['strasbourg'], 'sentiment' => 'neutral', 'follow_up_responses' => json_encode(['comment' => 'Ambiance froide, mais le travail est fait.', 'category' => 'Environnement']), 'created_at' => '2026-03-02 11:00:00'],
            ['branch_id' => $branchIds['strasbourg'], 'sentiment' => 'negative', 'customer_name' => 'Robert Wagner', 'follow_up_responses' => json_encode(['comment' => 'Horaires non respectés, agence fermée à l\'heure prévue.', 'category' => 'Horaires']), 'created_at' => '2026-02-28 17:30:00'],
            ['branch_id' => $branchIds['strasbourg'], 'sentiment' => 'positive', 'follow_up_responses' => json_encode(['comment' => 'Bonne surprise, le nouveau conseiller est top.', 'category' => 'Personnel']), 'created_at' => '2026-02-26 10:00:00'],
        ];

        foreach ($feedbacks as $data) {
            Feedback::create(array_merge([
                'customer_notified' => false,
                'wants_callback' => false,
            ], $data));
        }
    }
}
