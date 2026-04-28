<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\Branch;
use App\Models\Feedback;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class KpiCalculator
{
    /**
     * Calculate all KPIs for a branch within a given period.
     */
    public function forBranch(Branch $branch, string $period = '30d'): array
    {
        $days = $this->periodToDays($period);
        $since = Carbon::now()->subDays($days);
        $previousStart = Carbon::now()->subDays($days * 2);

        // Feedbacks current period
        $feedbacks = Feedback::where('branch_id', $branch->id)
            ->where('created_at', '>=', $since)
            ->get();

        // Feedbacks previous period (for trends)
        $previousFeedbacks = Feedback::where('branch_id', $branch->id)
            ->where('created_at', '>=', $previousStart)
            ->where('created_at', '<', $since)
            ->get();

        $total = $feedbacks->count();
        $previousTotal = $previousFeedbacks->count();

        // Sentiment counts
        $sentimentCounts = $feedbacks->groupBy('sentiment')->map->count();
        $happy = ($sentimentCounts->get('happy', 0) + $sentimentCounts->get('very_happy', 0));
        $unhappy = ($sentimentCounts->get('unhappy', 0) + $sentimentCounts->get('very_unhappy', 0));

        // Previous sentiment counts
        $prevSentimentCounts = $previousFeedbacks->groupBy('sentiment')->map->count();
        $prevHappy = ($prevSentimentCounts->get('happy', 0) + $prevSentimentCounts->get('very_happy', 0));

        // 1. Score de satisfaction global (%)
        $satisfactionRate = $total > 0 ? round(($happy / $total) * 100, 1) : 0;
        $prevSatisfactionRate = $previousTotal > 0 ? round(($prevHappy / $previousTotal) * 100, 1) : 0;

        // 2. NPS approximé (very_happy = promoteur, happy/neutral = passif, unhappy/very_unhappy = détracteur)
        $promoters = $sentimentCounts->get('very_happy', 0);
        $detractors = $unhappy;
        $nps = $total > 0 ? round((($promoters - $detractors) / $total) * 100) : 0;

        // 3. Taux d'insatisfaction (%)
        $dissatisfactionRate = $total > 0 ? round(($unhappy / $total) * 100, 1) : 0;

        // 4. Évolution mensuelle de la satisfaction (points)
        $satisfactionEvolution = round($satisfactionRate - $prevSatisfactionRate, 1);

        // 7. Taux de contact fourni (%)
        $withContact = $feedbacks->filter(function ($f) {
            return !empty($f->customer_phone) || !empty($f->customer_email);
        })->count();
        $contactRate = $total > 0 ? round(($withContact / $total) * 100, 1) : 0;

        // 9. Délai moyen de traitement d'alerte (heures)
        $resolvedAlerts = Alert::where('branch_id', $branch->id)
            ->where('status', 'resolved')
            ->whereNotNull('resolved_at')
            ->where('created_at', '>=', $since)
            ->get();

        $avgResolutionHours = 0;
        if ($resolvedAlerts->count() > 0) {
            $totalHours = $resolvedAlerts->sum(function ($alert) {
                return $alert->created_at->diffInMinutes($alert->resolved_at) / 60;
            });
            $avgResolutionHours = round($totalHours / $resolvedAlerts->count(), 1);
        }

        // 10. Taux d'alertes traitées (%)
        $totalAlerts = Alert::where('branch_id', $branch->id)
            ->where('created_at', '>=', $since)
            ->count();
        $resolvedCount = $resolvedAlerts->count();
        $alertResolutionRate = $totalAlerts > 0 ? round(($resolvedCount / $totalAlerts) * 100, 1) : 0;

        // 11. Taux de relance (clients insatisfaits avec contact qui ont été notifiés)
        $unhappyWithContact = $feedbacks->filter(function ($f) {
            return in_array($f->sentiment, ['unhappy', 'very_unhappy'])
                && (!empty($f->customer_phone) || !empty($f->customer_email));
        });
        $notified = $unhappyWithContact->filter(fn($f) => $f->customer_notified)->count();
        $followUpRate = $unhappyWithContact->count() > 0
            ? round(($notified / $unhappyWithContact->count()) * 100, 1)
            : 100; // 100% si aucun à relancer

        // 13. Taux de résolution des insatisfactions (%)
        $negativeAlerts = Alert::where('branch_id', $branch->id)
            ->where('type', 'negative_spike')
            ->where('created_at', '>=', $since)
            ->count();
        $resolvedNegative = Alert::where('branch_id', $branch->id)
            ->where('type', 'negative_spike')
            ->where('status', 'resolved')
            ->where('created_at', '>=', $since)
            ->count();
        $insatisfactionResolutionRate = $negativeAlerts > 0
            ? round(($resolvedNegative / $negativeAlerts) * 100, 1)
            : 100;

        // 14. Délai moyen de résolution (heures) — same as 9 but specifically for negative alerts
        $resolvedNegativeAlerts = Alert::where('branch_id', $branch->id)
            ->where('type', 'negative_spike')
            ->where('status', 'resolved')
            ->whereNotNull('resolved_at')
            ->where('created_at', '>=', $since)
            ->get();
        $avgNegativeResolutionHours = 0;
        if ($resolvedNegativeAlerts->count() > 0) {
            $totalH = $resolvedNegativeAlerts->sum(fn($a) => $a->created_at->diffInMinutes($a->resolved_at) / 60);
            $avgNegativeResolutionHours = round($totalH / $resolvedNegativeAlerts->count(), 1);
        }

        // 20. Feedbacks par mois
        $feedbacksPerMonth = $total;

        // 22. Raisons d'insatisfaction identifiées
        $issueLabels = [];
        $feedbacks->filter(fn($f) => in_array($f->sentiment, ['unhappy', 'very_unhappy']))
            ->each(function ($f) use (&$issueLabels) {
                $resp = is_string($f->follow_up_responses)
                    ? json_decode($f->follow_up_responses, true)
                    : $f->follow_up_responses;
                if (!empty($resp['selectedOptions']) && is_array($resp['selectedOptions'])) {
                    foreach ($resp['selectedOptions'] as $opt) {
                        $issueLabels[$opt] = ($issueLabels[$opt] ?? 0) + 1;
                    }
                }
            });
        arsort($issueLabels);
        $distinctIssuesCount = count($issueLabels);
        $topIssues = array_slice($issueLabels, 0, 10, true);

        // Callback rate (% wanting callback)
        $wantsCallback = $feedbacks->filter(fn($f) => $f->wants_callback)->count();
        $callbackRate = $total > 0 ? round(($wantsCallback / $total) * 100, 1) : 0;

        return [
            // Satisfaction
            'satisfaction_rate' => $satisfactionRate,
            'satisfaction_evolution' => $satisfactionEvolution,
            'nps' => $nps,
            'dissatisfaction_rate' => $dissatisfactionRate,
            'sentiment_counts' => [
                'very_happy' => $sentimentCounts->get('very_happy', 0),
                'happy' => $sentimentCounts->get('happy', 0),
                'neutral' => $sentimentCounts->get('neutral', 0),
                'unhappy' => $sentimentCounts->get('unhappy', 0),
                'very_unhappy' => $sentimentCounts->get('very_unhappy', 0),
            ],

            // Engagement
            'total_feedbacks' => $total,
            'feedbacks_per_month' => $feedbacksPerMonth,
            'contact_rate' => $contactRate,
            'callback_rate' => $callbackRate,

            // Réactivité
            'avg_alert_resolution_hours' => $avgResolutionHours,
            'alert_resolution_rate' => $alertResolutionRate,
            'follow_up_rate' => $followUpRate,
            'insatisfaction_resolution_rate' => $insatisfactionResolutionRate,
            'avg_insatisfaction_resolution_hours' => $avgNegativeResolutionHours,

            // Alertes
            'total_alerts' => $totalAlerts,
            'active_alerts' => $totalAlerts - $resolvedCount,
            'resolved_alerts' => $resolvedCount,

            // Problèmes
            'distinct_issues_count' => $distinctIssuesCount,
            'top_issues' => $topIssues,

            // Metadata
            'period' => $period,
            'since' => $since->toISOString(),
        ];
    }

    /**
     * Calculate network-level KPIs across all branches of an organization.
     */
    public function forOrganization(string $organizationId, string $period = '30d'): array
    {
        $branches = Branch::where('organization_id', $organizationId)
            ->where('is_active', true)
            ->get();

        $branchKpis = [];
        $allSatisfactionRates = [];

        foreach ($branches as $branch) {
            $kpis = $this->forBranch($branch, $period);
            $branchKpis[$branch->id] = [
                'branch_id' => $branch->id,
                'branch_name' => $branch->name,
                'kpis' => $kpis,
            ];
            if ($kpis['total_feedbacks'] > 0) {
                $allSatisfactionRates[$branch->id] = $kpis['satisfaction_rate'];
            }
        }

        // 18. Écart inter-agences
        $interBranchGap = count($allSatisfactionRates) >= 2
            ? round(max($allSatisfactionRates) - min($allSatisfactionRates), 1)
            : 0;

        // 19. Agences sous seuil critique (< 60%)
        $branchesBelowThreshold = collect($allSatisfactionRates)
            ->filter(fn($rate) => $rate < 60)
            ->count();

        // 21. Couverture réseau
        $totalBranches = Branch::where('organization_id', $organizationId)->count();
        $activeBranches = $branches->count();
        $networkCoverage = $totalBranches > 0
            ? round(($activeBranches / $totalBranches) * 100, 1)
            : 0;

        // Agrégation globale
        $totalFeedbacks = collect($branchKpis)->sum('kpis.total_feedbacks');
        $totalHappy = collect($branchKpis)->sum(fn($b) => $b['kpis']['sentiment_counts']['happy'] + $b['kpis']['sentiment_counts']['very_happy']);
        $globalSatisfaction = $totalFeedbacks > 0 ? round(($totalHappy / $totalFeedbacks) * 100, 1) : 0;

        $totalPromoters = collect($branchKpis)->sum('kpis.sentiment_counts.very_happy');
        $totalDetractors = collect($branchKpis)->sum(fn($b) => $b['kpis']['sentiment_counts']['unhappy'] + $b['kpis']['sentiment_counts']['very_unhappy']);
        $globalNps = $totalFeedbacks > 0 ? round((($totalPromoters - $totalDetractors) / $totalFeedbacks) * 100) : 0;

        $globalDissatisfaction = $totalFeedbacks > 0
            ? round(($totalDetractors / $totalFeedbacks) * 100, 1)
            : 0;

        // Ranking
        arsort($allSatisfactionRates);
        $ranking = [];
        $rank = 1;
        foreach ($allSatisfactionRates as $branchId => $rate) {
            $ranking[] = [
                'rank' => $rank++,
                'branch_id' => $branchId,
                'branch_name' => $branchKpis[$branchId]['branch_name'],
                'satisfaction_rate' => $rate,
                'total_feedbacks' => $branchKpis[$branchId]['kpis']['total_feedbacks'],
            ];
        }

        return [
            'global' => [
                'satisfaction_rate' => $globalSatisfaction,
                'nps' => $globalNps,
                'dissatisfaction_rate' => $globalDissatisfaction,
                'total_feedbacks' => $totalFeedbacks,
                'inter_branch_gap' => $interBranchGap,
                'branches_below_threshold' => $branchesBelowThreshold,
                'network_coverage' => $networkCoverage,
                'total_branches' => $totalBranches,
                'active_branches' => $activeBranches,
            ],
            'ranking' => $ranking,
            'branches' => $branchKpis,
            'period' => $period,
        ];
    }

    /**
     * Get KPI targets for a branch (branch-specific or org defaults).
     */
    public function getTargets(Branch $branch): array
    {
        $defaults = [
            'satisfaction_rate' => ['target' => 75, 'critical' => 60, 'unit' => '%'],
            'nps' => ['target' => 30, 'critical' => 0, 'unit' => 'pts'],
            'dissatisfaction_rate' => ['target' => 10, 'critical' => 25, 'unit' => '%', 'direction' => 'lower_is_better'],
            'contact_rate' => ['target' => 25, 'critical' => 10, 'unit' => '%'],
            'avg_alert_resolution_hours' => ['target' => 2, 'critical' => 8, 'unit' => 'h', 'direction' => 'lower_is_better'],
            'alert_resolution_rate' => ['target' => 90, 'critical' => 60, 'unit' => '%'],
            'follow_up_rate' => ['target' => 100, 'critical' => 80, 'unit' => '%'],
            'insatisfaction_resolution_rate' => ['target' => 70, 'critical' => 40, 'unit' => '%'],
            'avg_insatisfaction_resolution_hours' => ['target' => 48, 'critical' => 96, 'unit' => 'h', 'direction' => 'lower_is_better'],
            'feedbacks_per_month' => ['target' => 100, 'critical' => 30, 'unit' => ''],
            'distinct_issues_count' => ['target' => 3, 'critical' => 0, 'unit' => ''],
            'satisfaction_evolution' => ['target' => 2, 'critical' => -5, 'unit' => 'pts'],
        ];

        // Load branch-specific overrides from kpi_configs
        $configs = \App\Models\KpiConfig::where('organization_id', $branch->organization_id)
            ->where(function ($q) use ($branch) {
                $q->whereNull('branch_id')
                  ->orWhere('branch_id', $branch->id);
            })
            ->get();

        $targets = $defaults;

        foreach ($configs as $config) {
            $key = $config->config_key;
            $value = $config->config_value;

            if (!isset($targets[$key])) continue;

            // Branch-specific overrides take priority over org-level
            if ($config->branch_id === $branch->id) {
                if (isset($value['target'])) $targets[$key]['target'] = $value['target'];
                if (isset($value['critical'])) $targets[$key]['critical'] = $value['critical'];
                $targets[$key]['is_custom'] = true;
            } elseif (is_null($config->branch_id) && empty($targets[$key]['is_custom'])) {
                if (isset($value['target'])) $targets[$key]['target'] = $value['target'];
                if (isset($value['critical'])) $targets[$key]['critical'] = $value['critical'];
            }
        }

        return $targets;
    }

    /**
     * Evaluate KPIs against targets and return status per KPI.
     */
    public function evaluate(Branch $branch, string $period = '30d'): array
    {
        $kpis = $this->forBranch($branch, $period);
        $targets = $this->getTargets($branch);

        $evaluations = [];
        foreach ($targets as $key => $target) {
            if (!isset($kpis[$key])) continue;

            $value = $kpis[$key];
            $lowerIsBetter = ($target['direction'] ?? 'higher_is_better') === 'lower_is_better';

            if ($lowerIsBetter) {
                $status = $value <= $target['target'] ? 'on_target'
                    : ($value <= $target['critical'] ? 'warning' : 'critical');
            } else {
                $status = $value >= $target['target'] ? 'on_target'
                    : ($value >= $target['critical'] ? 'warning' : 'critical');
            }

            $evaluations[$key] = [
                'value' => $value,
                'target' => $target['target'],
                'critical' => $target['critical'],
                'unit' => $target['unit'],
                'status' => $status,
                'is_custom' => $target['is_custom'] ?? false,
            ];
        }

        return [
            'kpis' => $kpis,
            'evaluations' => $evaluations,
            'targets' => $targets,
        ];
    }

    private function periodToDays(string $period): int
    {
        return match ($period) {
            '24h' => 1, '7d' => 7, '30d' => 30, '90d' => 90, default => 30,
        };
    }
}
