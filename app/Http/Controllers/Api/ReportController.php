<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReportSchedule;
use App\Models\ReportHistory;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    // ── Schedules ──

    public function indexSchedules(Request $request)
    {
        $schedules = ReportSchedule::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['schedules' => $schedules]);
    }

    public function storeSchedule(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'frequency' => 'required|string|in:daily,weekly,monthly,custom',
            'report_type' => 'required|string',
            'recipients' => 'required|array|min:1',
            'recipients.*' => 'email',
            'is_active' => 'boolean',
            'include_branches' => 'nullable|array',
            'include_sentiments' => 'nullable|array',
            'include_global_metrics' => 'boolean',
            'include_branch_detail' => 'boolean',
            'include_charts' => 'boolean',
            'include_alerts' => 'boolean',
            'include_feedbacks' => 'boolean',
            'custom_interval_days' => 'nullable|integer|min:1|max:365',
        ]);

        $validated['user_id'] = $request->user()->id;
        $validated['next_run_at'] = now()->addDay();

        $schedule = ReportSchedule::create($validated);

        AuditLog::create([
            'actor_id' => $request->user()->id,
            'actor_email' => $request->user()->email,
            'action' => 'report_schedule.created',
            'target_type' => 'report_schedule',
            'target_id' => $schedule->id,
            'details' => ['name' => $schedule->name],
        ]);

        return response()->json(['schedule' => $schedule], 201);
    }

    public function updateSchedule(Request $request, ReportSchedule $schedule)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'frequency' => 'string|in:daily,weekly,monthly,custom',
            'report_type' => 'string',
            'recipients' => 'array|min:1',
            'recipients.*' => 'email',
            'is_active' => 'boolean',
            'include_branches' => 'nullable|array',
            'include_sentiments' => 'nullable|array',
            'include_global_metrics' => 'boolean',
            'include_branch_detail' => 'boolean',
            'include_charts' => 'boolean',
            'include_alerts' => 'boolean',
            'include_feedbacks' => 'boolean',
            'custom_interval_days' => 'nullable|integer|min:1|max:365',
        ]);

        $schedule->update($validated);

        return response()->json(['schedule' => $schedule]);
    }

    public function destroySchedule(Request $request, ReportSchedule $schedule)
    {
        AuditLog::create([
            'actor_id' => $request->user()->id,
            'actor_email' => $request->user()->email,
            'action' => 'report_schedule.deleted',
            'target_type' => 'report_schedule',
            'target_id' => $schedule->id,
        ]);

        $schedule->delete();

        return response()->json(['message' => 'Schedule deleted successfully']);
    }

    // ── History ──

    public function indexHistory(Request $request)
    {
        $histories = ReportHistory::where('user_id', $request->user()->id)
            ->with('schedule:id,name')
            ->orderByDesc('created_at')
            ->paginate($request->get('per_page', 25));

        return response()->json($histories);
    }

    public function storeHistory(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'report_type' => 'required|string',
            'format' => 'required|string|in:pdf,excel,csv,email',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
            'schedule_id' => 'nullable|uuid|exists:report_schedules,id',
            'sent_to' => 'nullable|array',
        ]);

        $validated['user_id'] = $request->user()->id;
        $validated['status'] = 'generated';

        $history = ReportHistory::create($validated);

        return response()->json(['history' => $history], 201);
    }
}
