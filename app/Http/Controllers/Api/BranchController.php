<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Branch::where('organization_id', $user->organization_id);

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
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

        return response()->json(['branches' => $branches]);
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
        $this->authorize('view', $branch);

        return response()->json(['branch' => $branch->loadCount('feedbacks')]);
    }

    public function update(Request $request, Branch $branch)
    {
        $this->authorize('update', $branch);

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
        $this->authorize('delete', $branch);

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
