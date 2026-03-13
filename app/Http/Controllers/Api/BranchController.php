<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Feedback;
use App\Models\Alert;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class BranchController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Branch::where('organization_id', $user->organization_id);

        // Par défaut, ne retourner que les agences actives
        // Passer ?include_inactive=1 pour voir toutes les agences (page de gestion)
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        } elseif (!$request->boolean('include_inactive')) {
            $query->where('is_active', true);
        }

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%")
                  ->orWhere('region', 'like', "%{$search}%");
            });
        }

        $branches = $query->withCount('feedbacks')->orderBy('name')->get();

        // Compute stats per branch
        $period = $request->get('period', '30d');
        $days = match ($period) {
            '24h' => 1, '7d' => 7, '30d' => 30, '90d' => 90, default => 30,
        };
        $since = Carbon::now()->subDays($days);

        $branchIds = $branches->pluck('id');

        // Get feedback counts per branch per sentiment in one query
        $feedbackStats = Feedback::whereIn('branch_id', $branchIds)
            ->where('created_at', '>=', $since)
            ->select('branch_id', 'sentiment', DB::raw('count(*) as count'))
            ->groupBy('branch_id', 'sentiment')
            ->get()
            ->groupBy('branch_id');

        // Get active alerts per branch in one query
        $alertCounts = Alert::whereIn('branch_id', $branchIds)
            ->where('status', 'active')
            ->select('branch_id', DB::raw('count(*) as count'))
            ->groupBy('branch_id')
            ->pluck('count', 'branch_id');

        $branchData = $branches->map(function ($branch) use ($feedbackStats, $alertCounts) {
            $sentiments = $feedbackStats->get($branch->id, collect());
            $total = $sentiments->sum('count');
            $positiveCount = $sentiments->whereIn('sentiment', ['happy', 'very_happy'])->sum('count');
            $satisfactionRate = $total > 0 ? round(($positiveCount / $total) * 100, 1) : 0;

            return array_merge($branch->toArray(), [
                'stats' => [
                    'total_feedbacks' => $total,
                    'satisfaction_rate' => $satisfactionRate,
                    'active_alerts' => $alertCounts->get($branch->id, 0),
                ],
            ]);
        });

        return response()->json(['branches' => $branchData]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'city' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:500',
            'region' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $validated['organization_id'] = $request->user()->organization_id;

        $branch = Branch::create($validated);

        AuditLog::create([
            'actor_id' => $request->user()->id,
            'actor_email' => $request->user()->email,
            'action' => 'branch.created',
            'target_type' => 'branch',
            'target_id' => $branch->id,
            'details' => ['name' => $branch->name],
        ]);

        return response()->json(['branch' => $branch], 201);
    }

    public function show(Request $request, Branch $branch)
    {
        $period = $request->get('period', '30d');
        $days = match ($period) {
            '24h' => 1, '7d' => 7, '30d' => 30, '90d' => 90, default => 30,
        };
        $since = Carbon::now()->subDays($days);

        $feedbackQuery = Feedback::where('branch_id', $branch->id)
            ->where('created_at', '>=', $since);

        $totalFeedbacks = (clone $feedbackQuery)->count();

        $sentimentCounts = (clone $feedbackQuery)
            ->select('sentiment', DB::raw('count(*) as count'))
            ->groupBy('sentiment')
            ->pluck('count', 'sentiment');

        $positiveCount = ($sentimentCounts->get('happy', 0) + $sentimentCounts->get('very_happy', 0));
        $satisfactionRate = $totalFeedbacks > 0
            ? round(($positiveCount / $totalFeedbacks) * 100, 1)
            : 0;

        // Weekly evolution
        $weeklyStats = (clone $feedbackQuery)
            ->select(DB::raw('YEARWEEK(created_at, 1) as yw'), DB::raw('MIN(DATE(created_at)) as week_start'), 'sentiment', DB::raw('count(*) as count'))
            ->groupBy('yw', 'sentiment')
            ->orderBy('yw')
            ->get()
            ->groupBy('yw');

        $evolution = [];
        $sentimentScores = ['very_happy' => 4, 'happy' => 3, 'unhappy' => 2, 'very_unhappy' => 1];
        foreach ($weeklyStats as $yw => $sentiments) {
            $totalScore = 0;
            $totalCount = 0;
            foreach ($sentiments as $s) {
                $score = $sentimentScores[$s->sentiment] ?? 3;
                $totalScore += $score * $s->count;
                $totalCount += $s->count;
            }
            $evolution[] = [
                'week' => Carbon::parse($sentiments->first()->week_start)->format('d M'),
                'score' => $totalCount > 0 ? round($totalScore / $totalCount, 1) : 0,
            ];
        }

        // Common issues from follow_up_responses
        $issuesFeedbacks = (clone $feedbackQuery)
            ->whereNotNull('follow_up_responses')
            ->pluck('follow_up_responses');

        $issueCounts = [];
        foreach ($issuesFeedbacks as $resp) {
            $decoded = is_string($resp) ? json_decode($resp, true) : $resp;
            if (!empty($decoded['selectedOptions']) && is_array($decoded['selectedOptions'])) {
                foreach ($decoded['selectedOptions'] as $opt) {
                    $issueCounts[$opt] = ($issueCounts[$opt] ?? 0) + 1;
                }
            }
        }
        arsort($issueCounts);
        $totalIssues = array_sum($issueCounts);
        $issues = [];
        foreach (array_slice($issueCounts, 0, 5, true) as $label => $count) {
            $issues[] = [
                'label' => $label,
                'count' => $count,
                'percentage' => $totalIssues > 0 ? round(($count / $totalIssues) * 100) : 0,
            ];
        }

        // Recent feedbacks
        $recentFeedbacks = Feedback::where('branch_id', $branch->id)
            ->where('created_at', '>=', $since)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        // Active alerts
        $activeAlerts = Alert::where('branch_id', $branch->id)
            ->where('status', 'active')
            ->count();

        // Ranking among all org branches
        $orgBranchIds = Branch::where('organization_id', $branch->organization_id)->pluck('id');
        $branchRates = [];
        foreach ($orgBranchIds as $bid) {
            $bTotal = Feedback::where('branch_id', $bid)->where('created_at', '>=', $since)->count();
            $bPositive = Feedback::where('branch_id', $bid)->where('created_at', '>=', $since)
                ->whereIn('sentiment', ['happy', 'very_happy'])->count();
            $branchRates[$bid] = $bTotal > 0 ? ($bPositive / $bTotal) * 100 : 0;
        }
        arsort($branchRates);
        $rank = array_search($branch->id, array_keys($branchRates));
        $rank = $rank !== false ? $rank + 1 : 0;

        return response()->json([
            'branch' => $branch,
            'stats' => [
                'total_feedbacks' => $totalFeedbacks,
                'satisfaction_rate' => $satisfactionRate,
                'positive_rate' => $satisfactionRate,
                'active_alerts' => $activeAlerts,
                'sentiment_counts' => $sentimentCounts,
                'rank' => $rank,
                'total_branches' => count($orgBranchIds),
            ],
            'evolution' => $evolution,
            'issues' => $issues,
            'feedbacks' => $recentFeedbacks,
        ]);
    }

    public function update(Request $request, Branch $branch)
    {
        if ($branch->organization_id !== $request->user()->organization_id) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'string|max:255',
            'city' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:500',
            'region' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $branch->update($validated);

        AuditLog::create([
            'actor_id' => $request->user()->id,
            'actor_email' => $request->user()->email,
            'action' => 'branch.updated',
            'target_type' => 'branch',
            'target_id' => $branch->id,
            'details' => $validated,
        ]);

        return response()->json(['branch' => $branch]);
    }

    public function destroy(Request $request, Branch $branch)
    {
        if ($branch->organization_id !== $request->user()->organization_id) {
            abort(403);
        }

        AuditLog::create([
            'actor_id' => $request->user()->id,
            'actor_email' => $request->user()->email,
            'action' => 'branch.deleted',
            'target_type' => 'branch',
            'target_id' => $branch->id,
            'details' => ['name' => $branch->name],
        ]);

        $branch->delete();

        return response()->json(['message' => 'Branch deleted successfully']);
    }
}
