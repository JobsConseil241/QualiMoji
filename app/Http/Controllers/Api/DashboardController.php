<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Feedback;
use App\Models\Branch;
use App\Models\Alert;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $orgId = $user->organization_id;
        $branchIds = $this->getUserBranchIds($user);
        $period = $request->get('period', '7d');
        $startDate = $this->getStartDate($period);

        $feedbackQuery = Feedback::whereIn('branch_id', $branchIds)
            ->where('created_at', '>=', $startDate);

        $totalFeedbacks = (clone $feedbackQuery)->count();
        $sentimentCounts = (clone $feedbackQuery)
            ->select('sentiment', DB::raw('count(*) as count'))
            ->groupBy('sentiment')
            ->pluck('count', 'sentiment');

        $satisfactionRate = $totalFeedbacks > 0
            ? round((($sentimentCounts->get('happy', 0) + $sentimentCounts->get('very_happy', 0)) / $totalFeedbacks) * 100, 1)
            : 0;

        // Previous period for trend
        $prevStartDate = $this->getStartDate($period, true);
        $prevFeedbacks = Feedback::whereIn('branch_id', $branchIds)
            ->whereBetween('created_at', [$prevStartDate, $startDate])
            ->count();
        $prevSatisfied = Feedback::whereIn('branch_id', $branchIds)
            ->whereBetween('created_at', [$prevStartDate, $startDate])
            ->whereIn('sentiment', ['happy', 'very_happy'])
            ->count();
        $prevRate = $prevFeedbacks > 0 ? round(($prevSatisfied / $prevFeedbacks) * 100, 1) : 0;
        $trend = $satisfactionRate - $prevRate;

        // Daily breakdown
        $dailyStats = (clone $feedbackQuery)
            ->select(DB::raw('DATE(created_at) as date'), 'sentiment', DB::raw('count(*) as count'))
            ->groupBy('date', 'sentiment')
            ->orderBy('date')
            ->get()
            ->groupBy('date');

        // Branch performance
        $branchStats = (clone $feedbackQuery)
            ->select('branch_id', 'sentiment', DB::raw('count(*) as count'))
            ->groupBy('branch_id', 'sentiment')
            ->get()
            ->groupBy('branch_id');

        $branches = Branch::whereIn('id', $branchIds)->get()->keyBy('id');
        $branchPerformance = [];
        foreach ($branchStats as $branchId => $sentiments) {
            $total = $sentiments->sum('count');
            $satisfied = $sentiments->whereIn('sentiment', ['happy', 'very_happy'])->sum('count');
            $branchPerformance[] = [
                'branch_id' => $branchId,
                'branch_name' => $branches[$branchId]->name ?? 'Unknown',
                'total_feedbacks' => $total,
                'satisfaction_rate' => $total > 0 ? round(($satisfied / $total) * 100, 1) : 0,
                'sentiments' => $sentiments->pluck('count', 'sentiment'),
            ];
        }

        // Active alerts
        $activeAlerts = Alert::where(function ($q) use ($orgId, $branchIds) {
            $q->where('organization_id', $orgId)
              ->orWhereIn('branch_id', $branchIds);
        })->where('status', 'active')->count();

        return response()->json([
            'total_feedbacks' => $totalFeedbacks,
            'satisfaction_rate' => $satisfactionRate,
            'trend' => $trend,
            'sentiment_counts' => $sentimentCounts,
            'daily_stats' => $dailyStats,
            'branch_performance' => $branchPerformance,
            'active_alerts' => $activeAlerts,
            'period' => $period,
        ]);
    }

    private function getUserBranchIds($user)
    {
        if ($user->hasRole('admin') || $user->hasRole('owner')) {
            return Branch::where('organization_id', $user->organization_id)
                ->where('is_active', true)
                ->pluck('id');
        }
        return $user->branches()->where('is_active', true)->pluck('branches.id');
    }

    private function getStartDate(string $period, bool $previous = false): Carbon
    {
        $days = match ($period) {
            '24h' => 1,
            '7d' => 7,
            '30d' => 30,
            '90d' => 90,
            default => 7,
        };
        $date = Carbon::now()->subDays($days);
        return $previous ? $date->subDays($days) : $date;
    }
}
