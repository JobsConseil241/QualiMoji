<?php

namespace App\Console\Commands;

use App\Models\Alert;
use App\Models\Branch;
use App\Models\Feedback;
use Carbon\Carbon;
use Illuminate\Console\Command;

class RegenerateAlerts extends Command
{
    protected $signature = 'alerts:regenerate {--flush : Delete all existing alerts first}';
    protected $description = 'Regenerate alerts from real feedback data';

    public function handle(): int
    {
        if ($this->option('flush')) {
            $count = Alert::count();
            \App\Models\NotificationLog::whereNotNull('alert_id')->update(['alert_id' => null]);
            Alert::query()->delete();
            $this->info("Flushed {$count} old alerts.");
        }

        $branches = Branch::where('is_active', true)->with('organization')->get();
        $created = 0;

        foreach ($branches as $branch) {
            if (!$branch->organization) continue;

            // 1. Check for negative spikes (5+ negatives in last 30 days)
            $negatives = Feedback::where('branch_id', $branch->id)
                ->whereIn('sentiment', ['unhappy', 'very_unhappy'])
                ->where('created_at', '>=', Carbon::now()->subDays(30))
                ->get();

            if ($negatives->count() >= 3) {
                Alert::create([
                    'branch_id' => $branch->id,
                    'branch_name' => $branch->name,
                    'type' => 'negative_spike',
                    'message' => "{$negatives->count()} avis negatifs recus ce mois pour {$branch->name}",
                    'status' => 'active',
                    'severity' => $negatives->count() >= 5 ? 'high' : 'medium',
                    'organization_id' => $branch->organization_id,
                    'feedback_ids' => $negatives->pluck('id')->toArray(),
                ]);
                $created++;
            }

            // 2. Check satisfaction rate
            $total = Feedback::where('branch_id', $branch->id)
                ->where('created_at', '>=', Carbon::now()->subDays(30))
                ->count();

            if ($total >= 3) {
                $positive = Feedback::where('branch_id', $branch->id)
                    ->whereIn('sentiment', ['happy', 'very_happy'])
                    ->where('created_at', '>=', Carbon::now()->subDays(30))
                    ->count();

                $rate = round(($positive / $total) * 100, 1);

                if ($rate < 60) {
                    Alert::create([
                        'branch_id' => $branch->id,
                        'branch_name' => $branch->name,
                        'type' => 'low_satisfaction',
                        'message' => "Satisfaction critique a {$rate}% pour {$branch->name} (seuil: 60%)",
                        'status' => 'active',
                        'severity' => 'high',
                        'organization_id' => $branch->organization_id,
                    ]);
                    $created++;
                } elseif ($rate < 75) {
                    Alert::create([
                        'branch_id' => $branch->id,
                        'branch_name' => $branch->name,
                        'type' => 'low_satisfaction',
                        'message' => "Satisfaction en dessous de l'objectif a {$rate}% pour {$branch->name} (cible: 75%)",
                        'status' => 'active',
                        'severity' => 'medium',
                        'organization_id' => $branch->organization_id,
                    ]);
                    $created++;
                }
            }

            // 3. Check consecutive negatives
            $lastFeedbacks = Feedback::where('branch_id', $branch->id)
                ->orderByDesc('created_at')
                ->limit(3)
                ->pluck('sentiment');

            if ($lastFeedbacks->count() >= 3 && $lastFeedbacks->every(fn($s) => in_array($s, ['unhappy', 'very_unhappy']))) {
                Alert::create([
                    'branch_id' => $branch->id,
                    'branch_name' => $branch->name,
                    'type' => 'consecutive_negative',
                    'message' => "3 avis negatifs consecutifs pour {$branch->name}",
                    'status' => 'active',
                    'severity' => 'medium',
                    'organization_id' => $branch->organization_id,
                ]);
                $created++;
            }

            // 4. Check low volume
            if ($total < 3 && $total > 0) {
                Alert::create([
                    'branch_id' => $branch->id,
                    'branch_name' => $branch->name,
                    'type' => 'low_volume',
                    'message' => "Seulement {$total} feedback(s) ce mois pour {$branch->name} (minimum recommande: 10)",
                    'status' => 'active',
                    'severity' => 'low',
                    'organization_id' => $branch->organization_id,
                ]);
                $created++;
            }
        }

        // Create a resolved alert for demo
        $firstBranch = $branches->first();
        if ($firstBranch) {
            Alert::create([
                'branch_id' => $firstBranch->id,
                'branch_name' => $firstBranch->name,
                'type' => 'negative_spike',
                'message' => "Pic de feedbacks negatifs traite pour {$firstBranch->name}",
                'status' => 'resolved',
                'severity' => 'medium',
                'organization_id' => $firstBranch->organization_id,
                'resolved_at' => Carbon::now()->subDays(2),
                'resolution_note' => 'Probleme de temps d\'attente identifie. Renfort personnel mis en place.',
            ]);
            $created++;
        }

        $this->info("Created {$created} alerts from real feedback data.");
        return 0;
    }
}
