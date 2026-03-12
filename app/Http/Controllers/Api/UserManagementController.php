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
            ->with(['userRole', 'branchAssignments']);

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

        $users = $query->orderBy('name')->get()->map(function ($u) {
            $data = $u->toArray();
            $data['branch_ids'] = $u->branchAssignments->pluck('branch_id')->values()->toArray();
            return $data;
        });

        return response()->json(['users' => $users]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'nullable|string|min:8',
            'full_name' => 'nullable|string|max:255',
            'role' => 'required|string|in:admin,quality_director,branch_manager,it_admin,manager,viewer',
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'uuid|exists:branches,id',
        ]);

        $name = $validated['name'] ?? $validated['full_name'] ?? explode('@', $validated['email'])[0];
        $password = $validated['password'] ?? Hash::make(\Illuminate\Support\Str::random(32));

        $user = User::create([
            'name' => $name,
            'email' => $validated['email'],
            'password' => is_string($password) && !str_starts_with($password, '$2y$') ? Hash::make($password) : $password,
            'full_name' => $validated['full_name'] ?? $name,
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
            'action' => 'user_invited',
            'target_type' => 'user',
            'target_id' => (string) $user->id,
            'details' => ['email' => $user->email, 'full_name' => $user->full_name, 'role' => $validated['role']],
        ]);

        return response()->json([
            'user' => $user->load('userRole', 'branchAssignments'),
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
            'role' => 'nullable|string|in:admin,quality_director,branch_manager,it_admin,manager,viewer',
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

        $action = 'user_role_changed';
        if (isset($validated['is_active'])) {
            $action = $validated['is_active'] ? 'user_activated' : 'user_deactivated';
        }
        if (isset($validated['branch_ids'])) {
            $action = 'user_branches_updated';
        }

        AuditLog::create([
            'actor_id' => $request->user()->id,
            'actor_email' => $request->user()->email,
            'action' => $action,
            'target_type' => 'user',
            'target_id' => (string) $managedUser->id,
            'details' => ['email' => $managedUser->email, 'full_name' => $managedUser->full_name, ...$validated],
        ]);

        return response()->json([
            'user' => $managedUser->fresh()->load('userRole', 'branchAssignments'),
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
