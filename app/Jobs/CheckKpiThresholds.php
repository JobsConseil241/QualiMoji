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
use Illuminate\Support\Facades\DB;
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

        // Get KPI configs for this organization
        $kpiConfigs = KpiConfig::where('organization_id', $org->id)->get();

        foreach ($kpiConfigs as $config) {
            $this->checkThreshold($config, $branch);
        }
    }

    private function checkThreshold(KpiConfig $config, Branch $branch): void
    {
        $value = $config->config_value;
        $key = $config->config_key;

        if ($key === 'negative_feedback_threshold') {
            $threshold = $value['threshold'] ?? 5;
            $period = $value['period_hours'] ?? 24;

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
                    Alert::create([
                        'branch_id' => $branch->id,
                        'branch_name' => $branch->name,
                        'type' => 'negative_spike',
                        'message' => "{$negativeCount} avis négatifs reçus en {$period}h pour {$branch->name}",
                        'status' => 'active',
                        'severity' => 'high',
                        'organization_id' => $branch->organization_id,
                        'feedback_ids' => [$this->feedback->id],
                    ]);

                    SendNotification::dispatch('negative_spike', $branch, [
                        'count' => $negativeCount,
                        'period' => $period,
                    ]);
                }
            }
        }

        if ($key === 'satisfaction_drop_threshold') {
            $dropPercent = $value['drop_percent'] ?? 10;

            $currentRate = $this->getSatisfactionRate($branch, 24);
            $previousRate = $this->getSatisfactionRate($branch, 48, 24);

            if ($previousRate > 0 && ($previousRate - $currentRate) >= $dropPercent) {
                Alert::create([
                    'branch_id' => $branch->id,
                    'branch_name' => $branch->name,
                    'type' => 'satisfaction_drop',
                    'message' => "Baisse de satisfaction de {$previousRate}% à {$currentRate}% pour {$branch->name}",
                    'status' => 'active',
                    'severity' => 'medium',
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
