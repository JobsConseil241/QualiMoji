<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Zone;
use App\Models\Branch;
use Illuminate\Http\Request;

class ZoneController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $zones = Zone::where('organization_id', $user->organization_id)
            ->withCount(['branches', 'branches as active_branches_count' => function ($q) {
                $q->where('is_active', true);
            }])
            ->orderBy('name')
            ->get();

        return response()->json($zones);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:500',
        ]);

        $zone = Zone::create([
            ...$validated,
            'organization_id' => $request->user()->organization_id,
        ]);

        return response()->json($zone, 201);
    }

    public function update(Request $request, Zone $zone)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
        ]);

        $zone->update($validated);

        return response()->json($zone);
    }

    public function destroy(Zone $zone)
    {
        // Detach branches from this zone before deleting
        Branch::where('zone_id', $zone->id)->update(['zone_id' => null]);
        $zone->delete();

        return response()->json(['message' => 'Zone supprimee']);
    }

    public function assignBranches(Request $request, Zone $zone)
    {
        $validated = $request->validate([
            'branch_ids' => 'required|array',
            'branch_ids.*' => 'uuid|exists:branches,id',
        ]);

        // Remove these branches from any other zone first
        Branch::whereIn('id', $validated['branch_ids'])->update(['zone_id' => null]);

        // Assign to this zone
        Branch::whereIn('id', $validated['branch_ids'])
            ->where('organization_id', $request->user()->organization_id)
            ->update(['zone_id' => $zone->id]);

        return response()->json(['message' => 'Agences assignees a la zone']);
    }
}
