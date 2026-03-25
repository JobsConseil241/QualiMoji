<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserRole;
use App\Models\UserBranchAssignment;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

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
            $data['zone_id'] = $u->userRole?->zone_id;
            return $data;
        });

        return response()->json(['users' => $users]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'nullable|string|min:6',
            'full_name' => 'nullable|string|max:255',
            'role' => 'required|string|in:admin,quality_director,zone_director,branch_director,it_admin,viewer',
            'zone_id' => 'nullable|uuid|exists:zones,id',
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'uuid|exists:branches,id',
        ]);

        $name = $validated['name'] ?? $validated['full_name'] ?? explode('@', $validated['email'])[0];
        $tempPassword = $validated['password'] ?? Str::random(10);

        $user = User::create([
            'name' => $name,
            'email' => $validated['email'],
            'password' => Hash::make($tempPassword),
            'full_name' => $validated['full_name'] ?? $name,
            'organization_id' => $request->user()->organization_id,
            'is_active' => true,
        ]);

        UserRole::create([
            'user_id' => $user->id,
            'role' => $validated['role'],
            'zone_id' => $validated['zone_id'] ?? null,
        ]);

        if (!empty($validated['branch_ids'])) {
            $branchIds = $validated['branch_ids'];
            // Branch director: max 1 branch
            if ($validated['role'] === 'branch_director' && count($branchIds) > 1) {
                $branchIds = [array_shift($branchIds)];
            }
            foreach ($branchIds as $branchId) {
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

        // Send invitation email
        $roleLabels = [
            'admin' => 'Administrateur',
            'quality_director' => 'Directeur Qualité',
            'zone_director' => 'Directeur de Zone',
            'branch_director' => "Directeur d'Agence",
            'it_admin' => 'Admin IT',
            'viewer' => 'Lecteur',
        ];

        $org = $request->user()->organization;
        $orgName = $org?->name ?? 'QualiMoji';

        try {
            Mail::send('emails.user-invitation', [
                'orgName' => $orgName,
                'fullName' => $user->full_name,
                'userEmail' => $user->email,
                'tempPassword' => $tempPassword,
                'roleLabel' => $roleLabels[$validated['role']] ?? $validated['role'],
                'loginUrl' => config('app.url') . '/login',
            ], function ($message) use ($user, $orgName) {
                $message->to($user->email)
                    ->subject("{$orgName} — Invitation à rejoindre la plateforme");
            });
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to send invitation email to {$user->email}: {$e->getMessage()}");
        }

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

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'full_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:6',
            'send_credentials' => 'nullable|boolean',
            'is_active' => 'boolean',
            'role' => 'nullable|string|in:admin,quality_director,zone_director,branch_director,it_admin,viewer',
            'zone_id' => 'nullable|uuid|exists:zones,id',
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'uuid|exists:branches,id',
        ]);

        $updateData = collect($validated)->only(['name', 'full_name', 'email', 'is_active'])->filter()->toArray();
        if (isset($validated['full_name'])) {
            $updateData['name'] = $validated['full_name'];
        }
        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }
        $user->update($updateData);

        // Send credentials email if password was reset
        if (!empty($validated['password']) && !empty($validated['send_credentials'])) {
            $roleLabels = [
                'admin' => 'Administrateur',
                'quality_director' => 'Directeur Qualité',
                'zone_director' => 'Directeur de Zone',
                'branch_director' => "Directeur d'Agence",
                'it_admin' => 'Admin IT',
                'viewer' => 'Lecteur',
            ];
            $org = $request->user()->organization;
            $orgName = $org?->name ?? 'QualiMoji';
            $userRole = $user->userRole?->role ?? 'viewer';

            try {
                Mail::send('emails.user-invitation', [
                    'orgName' => $orgName,
                    'fullName' => $user->full_name,
                    'userEmail' => $user->email,
                    'tempPassword' => $validated['password'],
                    'roleLabel' => $roleLabels[$userRole] ?? $userRole,
                    'loginUrl' => config('app.url') . '/login',
                ], function ($message) use ($user, $orgName) {
                    $message->to($user->email)
                        ->subject("{$orgName} — Vos nouveaux identifiants");
                });
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("Failed to send credentials email to {$user->email}: {$e->getMessage()}");
            }
        }

        if (isset($validated['role'])) {
            UserRole::updateOrCreate(
                ['user_id' => $user->id],
                ['role' => $validated['role'], 'zone_id' => $validated['zone_id'] ?? null]
            );
        }

        if (isset($validated['branch_ids'])) {
            $role = $validated['role'] ?? $user->userRole?->role;
            $branchIds = $validated['branch_ids'];

            // Branch director: max 1 branch
            if ($role === 'branch_director' && count($branchIds) > 1) {
                $branchIds = [array_shift($branchIds)];
            }

            UserBranchAssignment::where('user_id', $user->id)->delete();
            foreach ($branchIds as $branchId) {
                UserBranchAssignment::create([
                    'user_id' => $user->id,
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
            'target_id' => (string) $user->id,
            'details' => ['email' => $user->email, 'full_name' => $user->full_name, ...$validated],
        ]);

        return response()->json([
            'user' => $user->fresh()->load('userRole', 'branchAssignments'),
        ]);
    }

    public function destroy(Request $request, User $user)
    {
        AuditLog::create([
            'actor_id' => $request->user()->id,
            'actor_email' => $request->user()->email,
            'action' => 'user.deleted',
            'target_type' => 'user',
            'target_id' => (string) $user->id,
            'details' => ['email' => $user->email],
        ]);

        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }
}
