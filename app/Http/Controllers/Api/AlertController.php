<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Branch;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $branchIds = $this->getUserBranchIds($user);

        $query = Alert::where(function ($q) use ($user, $branchIds) {
            $q->where('organization_id', $user->organization_id)
              ->orWhereIn('branch_id', $branchIds);
        });

        if ($request->has('status')) {
            $query->where('status', $request->get('status'));
        }

        if ($request->has('type')) {
            $query->where('type', $request->get('type'));
        }

        if ($request->has('is_read')) {
            $query->where('is_read', $request->boolean('is_read'));
        }

        $alerts = $query->orderByDesc('created_at')
            ->paginate($request->get('per_page', 25));

        return response()->json($alerts);
    }

    public function show(Request $request, Alert $alert)
    {
        return response()->json(['alert' => $alert]);
    }

    public function markAsRead(Request $request, Alert $alert)
    {
        $alert->update(['is_read' => true]);

        return response()->json(['alert' => $alert]);
    }

    public function resolve(Request $request, Alert $alert)
    {
        $validated = $request->validate([
            'resolution_note' => 'nullable|string|max:1000',
        ]);

        $alert->update([
            'status' => 'resolved',
            'resolution_note' => $validated['resolution_note'] ?? null,
            'resolved_at' => now(),
            'resolved_by' => $request->user()->id,
            'is_read' => true,
        ]);

        AuditLog::create([
            'actor_id' => $request->user()->id,
            'actor_email' => $request->user()->email,
            'action' => 'alert.resolved',
            'target_type' => 'alert',
            'target_id' => $alert->id,
            'details' => ['resolution_note' => $validated['resolution_note'] ?? null],
        ]);

        return response()->json(['alert' => $alert]);
    }

    public function markAllAsRead(Request $request)
    {
        $user = $request->user();
        $branchIds = $this->getUserBranchIds($user);

        Alert::where(function ($q) use ($user, $branchIds) {
            $q->where('organization_id', $user->organization_id)
              ->orWhereIn('branch_id', $branchIds);
        })->where('is_read', false)->update(['is_read' => true]);

        return response()->json(['message' => 'All alerts marked as read']);
    }

    public function stats(Request $request)
    {
        $user = $request->user();
        $branchIds = $this->getUserBranchIds($user);

        $query = Alert::where(function ($q) use ($user, $branchIds) {
            $q->where('organization_id', $user->organization_id)
              ->orWhereIn('branch_id', $branchIds);
        });

        return response()->json([
            'total' => (clone $query)->count(),
            'active' => (clone $query)->where('status', 'active')->count(),
            'unread' => (clone $query)->where('is_read', false)->count(),
            'resolved' => (clone $query)->where('status', 'resolved')->count(),
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
