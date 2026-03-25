<?php

namespace App\Jobs;

use App\Models\Feedback;
use App\Models\Alert;
use App\Models\Branch;
use App\Models\KpiConfig;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class CheckKpiThresholds implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Feedback $feedback
    ) {}

    public function handle(): void
    {
        $branch = $this->feedback->branch;
        if (!$branch) return;

        $org = $branch->organization;
        if (!$org) return;

        $this->checkNegativeSpike($branch);
        $this->checkSatisfactionDrop($branch);
        $this->checkConsecutiveNegative($branch);
        $this->checkLowSatisfaction($branch);
        $this->checkInactivity($branch);
    }

    /**
     * Pic de feedbacks négatifs dans une fenêtre de temps.
     */
    private function checkNegativeSpike(Branch $branch): void
    {
        $config = KpiConfig::getEffective($branch->organization_id, $branch->id, 'negative_feedback_threshold');
        $value = $config?->config_value ?? [];

        $threshold = $value['threshold'] ?? 5;
        $period = $value['period_hours'] ?? 24;
        $enabled = $value['enabled'] ?? true;
        if (!$enabled) return;

        $negativeCount = Feedback::where('branch_id', $branch->id)
            ->whereIn('sentiment', ['unhappy', 'very_unhappy'])
            ->where('created_at', '>=', Carbon::now()->subHours($period))
            ->count();

        if ($negativeCount >= $threshold) {
            $existing = Alert::where('branch_id', $branch->id)
                ->where('type', 'negative_spike')
                ->where('status', 'active')
                ->where('created_at', '>=', Carbon::now()->subHours($period))
                ->first();

            if (!$existing) {
                $alert = Alert::create([
                    'branch_id' => $branch->id,
                    'branch_name' => $branch->name,
                    'type' => 'negative_spike',
                    'message' => "{$negativeCount} avis négatifs reçus en {$period}h pour {$branch->name}",
                    'status' => 'active',
                    'severity' => $value['severity'] ?? 'high',
                    'organization_id' => $branch->organization_id,
                    'feedback_ids' => [$this->feedback->id],
                ]);

                SendNotification::dispatch('negative_spike', $branch, [
                    'count' => $negativeCount,
                    'period' => $period,
                ], $alert->id);
            }
        }
    }

    /**
     * Chute du taux de satisfaction entre deux périodes.
     */
    private function checkSatisfactionDrop(Branch $branch): void
    {
        $config = KpiConfig::getEffective($branch->organization_id, $branch->id, 'satisfaction_drop_threshold');
        $value = $config?->config_value ?? [];

        $dropPercent = $value['drop_percent'] ?? 10;
        $enabled = $value['enabled'] ?? true;
        if (!$enabled) return;

        $currentRate = $this->getSatisfactionRate($branch, 24);
        $previousRate = $this->getSatisfactionRate($branch, 48, 24);

        if ($previousRate > 0 && ($previousRate - $currentRate) >= $dropPercent) {
            $existing = Alert::where('branch_id', $branch->id)
                ->where('type', 'satisfaction_drop')
                ->where('status', 'active')
                ->where('created_at', '>=', Carbon::now()->subHours(24))
                ->first();

            if (!$existing) {
                $alert = Alert::create([
                    'branch_id' => $branch->id,
                    'branch_name' => $branch->name,
                    'type' => 'satisfaction_drop',
                    'message' => "Baisse de satisfaction de {$previousRate}% à {$currentRate}% pour {$branch->name}",
                    'status' => 'active',
                    'severity' => $value['severity'] ?? 'medium',
                    'organization_id' => $branch->organization_id,
                ]);

                SendNotification::dispatch('satisfaction_drop', $branch, [
                    'current_rate' => $currentRate,
                    'previous_rate' => $previousRate,
                ], $alert->id);
            }
        }
    }

    /**
     * Feedbacks négatifs consécutifs.
     */
    private function checkConsecutiveNegative(Branch $branch): void
    {
        $config = KpiConfig::getEffective($branch->organization_id, $branch->id, 'consecutive_negative_threshold');
        $value = $config?->config_value ?? [];

        $threshold = $value['threshold'] ?? 3;
        $enabled = $value['enabled'] ?? true;
        if (!$enabled) return;

        // Récupérer les N derniers feedbacks
        $lastFeedbacks = Feedback::where('branch_id', $branch->id)
            ->orderByDesc('created_at')
            ->limit($threshold)
            ->pluck('sentiment');

        if ($lastFeedbacks->count() < $threshold) return;

        // Vérifier qu'ils sont tous négatifs
        $allNegative = $lastFeedbacks->every(fn($s) => in_array($s, ['unhappy', 'very_unhappy']));

        if ($allNegative) {
            $existing = Alert::where('branch_id', $branch->id)
                ->where('type', 'consecutive_negative')
                ->where('status', 'active')
                ->where('created_at', '>=', Carbon::now()->subHours(4))
                ->first();

            if (!$existing) {
                $alert = Alert::create([
                    'branch_id' => $branch->id,
                    'branch_name' => $branch->name,
                    'type' => 'consecutive_negative',
                    'message' => "{$threshold} avis négatifs consécutifs pour {$branch->name}",
                    'status' => 'active',
                    'severity' => $value['severity'] ?? 'warning',
                    'organization_id' => $branch->organization_id,
                    'feedback_ids' => [$this->feedback->id],
                ]);

                SendNotification::dispatch('consecutive_negative', $branch, [
                    'count' => $threshold,
                ], $alert->id);
            }
        }
    }

    /**
     * Satisfaction basse sur le mois en cours.
     */
    private function checkLowSatisfaction(Branch $branch): void
    {
        $config = KpiConfig::getEffective($branch->organization_id, $branch->id, 'low_satisfaction_threshold');
        $value = $config?->config_value ?? [];

        $threshold = $value['threshold'] ?? 60;
        $enabled = $value['enabled'] ?? true;
        if (!$enabled) return;

        $currentRate = $this->getSatisfactionRate($branch, 720); // ~30 jours

        if ($currentRate > 0 && $currentRate < $threshold) {
            // Minimum de feedbacks pour que ce soit significatif
            $minFeedbacks = Feedback::where('branch_id', $branch->id)
                ->where('created_at', '>=', Carbon::now()->subDays(30))
                ->count();

            if ($minFeedbacks < 10) return;

            $existing = Alert::where('branch_id', $branch->id)
                ->where('type', 'low_satisfaction')
                ->where('status', 'active')
                ->where('created_at', '>=', Carbon::now()->subDays(7))
                ->first();

            if (!$existing) {
                Alert::create([
                    'branch_id' => $branch->id,
                    'branch_name' => $branch->name,
                    'type' => 'low_satisfaction',
                    'message' => "Satisfaction critique à {$currentRate}% pour {$branch->name} (seuil: {$threshold}%)",
                    'status' => 'active',
                    'severity' => $value['severity'] ?? 'critical',
                    'organization_id' => $branch->organization_id,
                ]);
            }
        }
    }

    /**
     * Aucun feedback reçu depuis X heures (kiosque en panne ?).
     */
    private function checkInactivity(Branch $branch): void
    {
        $config = KpiConfig::getEffective($branch->organization_id, $branch->id, 'inactivity_threshold');
        $value = $config?->config_value ?? [];

        $hoursThreshold = $value['hours'] ?? 48;
        $enabled = $value['enabled'] ?? false; // désactivé par défaut
        if (!$enabled) return;

        $lastFeedback = Feedback::where('branch_id', $branch->id)
            ->orderByDesc('created_at')
            ->first();

        if (!$lastFeedback) return;

        $hoursSinceLastFeedback = $lastFeedback->created_at->diffInHours(Carbon::now());

        if ($hoursSinceLastFeedback >= $hoursThreshold) {
            $existing = Alert::where('branch_id', $branch->id)
                ->where('type', 'inactivity')
                ->where('status', 'active')
                ->first();

            if (!$existing) {
                Alert::create([
                    'branch_id' => $branch->id,
                    'branch_name' => $branch->name,
                    'type' => 'inactivity',
                    'message' => "Aucun feedback reçu depuis {$hoursSinceLastFeedback}h pour {$branch->name}",
                    'status' => 'active',
                    'severity' => $value['severity'] ?? 'medium',
                    'organization_id' => $branch->organization_id,
                ]);
            }
        }
    }

    private function getSatisfactionRate(Branch $branch, int $hoursBack, int $hoursStart = 0): float
    {
        $query = Feedback::where('branch_id', $branch->id)
            ->where('created_at', '>=', Carbon::now()->subHours($hoursBack));

        if ($hoursStart > 0) {
            $query->where('created_at', '<', Carbon::now()->subHours($hoursStart));
        }

        $total = (clone $query)->count();
        if ($total === 0) return 0;

        $positive = (clone $query)->whereIn('sentiment', ['happy', 'very_happy'])->count();

        return round(($positive / $total) * 100, 1);
    }
}
