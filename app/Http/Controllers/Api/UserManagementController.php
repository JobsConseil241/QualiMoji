<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserRole;
use App\Models\UserBranchAssignment;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserManagementController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = User::where('organization_id', $user->organization_id)
            ->with(['userRole', 'branchAssignments.branch']);

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('full_name', 'like', "%{$search}%");
            });
        }

        if ($request->has('role')) {
            $query->whereHas('userRole', fn($q) => $q->where('role', $request->get('role')));
        }

        $users = $query->orderBy('name')->get();

        return response()->json(['users' => $users]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'full_name' => 'nullable|string|max:255',
            'role' => 'required|string|in:admin,manager,viewer',
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'uuid|exists:branches,id',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'full_name' => $validated['full_name'] ?? $validated['name'],
            'organization_id' => $request->user()->organization_id,
            'is_active' => true,
        ]);

        UserRole::create([
            'user_id' => $user->id,
            'role' => $validated['role'],
        ]);

        if (!empty($validated['branch_ids'])) {
            foreach ($validated['branch_ids'] as $branchId) {
                UserBranchAssignment::create([
                    'user_id' => $user->id,
                    'branch_id' => $branchId,
                ]);
            }
        }

        AuditLog::create([
            'actor_id' => $request->user()->id,
            'actor_email' => $request->user()->email,
            'action' => 'user.created',
            'target_type' => 'user',
            'target_id' => (string) $user->id,
            'details' => ['email' => $user->email, 'role' => $validated['role']],
        ]);

        return response()->json([
            'user' => $user->load('userRole', 'branchAssignments.branch'),
        ], 201);
    }

    public function show(Request $request, User $user)
    {
        return response()->json([
            'user' => $user->load('userRole', 'branchAssignments.branch'),
        ]);
    }

    public function update(Request $request, User $managedUser)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'full_name' => 'nullable|string|max:255',
            'is_active' => 'boolean',
            'role' => 'nullable|string|in:admin,manager,viewer',
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'uuid|exists:branches,id',
        ]);

        $managedUser->update(collect($validated)->only(['name', 'full_name', 'is_active'])->toArray());

        if (isset($validated['role'])) {
            UserRole::updateOrCreate(
                ['user_id' => $managedUser->id],
                ['role' => $validated['role']]
            );
        }

        if (isset($validated['branch_ids'])) {
            UserBranchAssignment::where('user_id', $managedUser->id)->delete();
            foreach ($validated['branch_ids'] as $branchId) {
                UserBranchAssignment::create([
                    'user_id' => $managedUser->id,
                    'branch_id' => $branchId,
                ]);
            }
        }

        AuditLog::create([
            'actor_id' => $request->user()->id,
            'actor_email' => $request->user()->email,
            'action' => 'user.updated',
            'target_type' => 'user',
            'target_id' => (string) $managedUser->id,
            'details' => $validated,
        ]);

        return response()->json([
            'user' => $managedUser->fresh()->load('userRole', 'branchAssignments.branch'),
        ]);
    }

    public function destroy(Request $request, User $managedUser)
    {
        AuditLog::create([
            'actor_id' => $request->user()->id,
            'actor_email' => $request->user()->email,
            'action' => 'user.deleted',
            'target_type' => 'user',
            'target_id' => (string) $managedUser->id,
            'details' => ['email' => $managedUser->email],
        ]);

        $managedUser->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }
}
