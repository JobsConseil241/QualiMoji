<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Feedback;
use App\Models\Branch;
use App\Jobs\CheckKpiThresholds;
use App\Jobs\SendCustomerWhatsApp;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $branchIds = $this->getUserBranchIds($user);

        $query = Feedback::whereIn('branch_id', $branchIds)
            ->with('branch:id,name');

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->get('branch_id'));
        }

        if ($request->has('sentiment')) {
            $query->where('sentiment', $request->get('sentiment'));
        }

        if ($request->has('start_date')) {
            $query->where('created_at', '>=', $request->get('start_date'));
        }

        if ($request->has('end_date')) {
            $query->where('created_at', '<=', $request->get('end_date'));
        }

        if ($request->has('wants_callback')) {
            $query->where('wants_callback', $request->boolean('wants_callback'));
        }

        $feedbacks = $query->orderByDesc('created_at')
            ->paginate($request->get('per_page', 25));

        return response()->json($feedbacks);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|uuid|exists:branches,id',
            'sentiment' => 'required|string|in:very_happy,happy,unhappy,very_unhappy',
            'follow_up_responses' => 'nullable|array',
            'customer_name' => 'nullable|string|max:255',
            'customer_email' => 'nullable|email|max:255',
            'customer_phone' => 'nullable|string|max:20',
            'wants_callback' => 'boolean',
        ]);

        $feedback = Feedback::create($validated);

        // Dispatch jobs
        CheckKpiThresholds::dispatch($feedback);

        if (!empty($validated['customer_phone'])) {
            SendCustomerWhatsApp::dispatch($feedback);
        }

        return response()->json(['feedback' => $feedback->load('branch:id,name')], 201);
    }

    public function show(Request $request, Feedback $feedback)
    {
        $feedback->load('branch:id,name');

        return response()->json(['feedback' => $feedback]);
    }

    public function update(Request $request, Feedback $feedback)
    {
        $validated = $request->validate([
            'customer_notified' => 'boolean',
            'wants_callback' => 'boolean',
        ]);

        $feedback->update($validated);

        return response()->json(['feedback' => $feedback]);
    }

    public function stats(Request $request)
    {
        $user = $request->user();
        $branchIds = $this->getUserBranchIds($user);

        $query = Feedback::whereIn('branch_id', $branchIds);

        if ($request->has('start_date')) {
            $query->where('created_at', '>=', $request->get('start_date'));
        }

        if ($request->has('end_date')) {
            $query->where('created_at', '<=', $request->get('end_date'));
        }

        $total = (clone $query)->count();
        $sentiments = (clone $query)
            ->selectRaw('sentiment, count(*) as count')
            ->groupBy('sentiment')
            ->pluck('count', 'sentiment');

        $callbackRequests = (clone $query)->where('wants_callback', true)->count();

        return response()->json([
            'total' => $total,
            'sentiments' => $sentiments,
            'callback_requests' => $callbackRequests,
        ]);
    }

    private function getUserBranchIds($user)
    {
        if ($user->hasRole('admin') || $user->hasRole('owner')) {
            return Branch::where('organization_id', $user->organization_id)->pluck('id');
        }
        return $user->branches()->pluck('branches.id');
    }
}
