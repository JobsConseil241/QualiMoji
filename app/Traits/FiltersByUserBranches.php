<?php

namespace App\Traits;

use App\Models\Branch;

trait FiltersByUserBranches
{
    private function getUserBranchIds($user)
    {
        // Admin / Owner: all active branches in org
        if ($user->hasRole('admin') || $user->hasRole('owner')) {
            return Branch::where('organization_id', $user->organization_id)
                ->where('is_active', true)
                ->pluck('id');
        }

        // Zone Director: all active branches in their zone
        if ($user->hasRole('zone_director')) {
            $zoneId = $user->userRole?->zone_id;
            if ($zoneId) {
                return Branch::where('organization_id', $user->organization_id)
                    ->where('zone_id', $zoneId)
                    ->where('is_active', true)
                    ->pluck('id');
            }
        }

        // Branch Director / Branch Manager / others: only assigned branches
        return $user->branches()->where('is_active', true)->pluck('branches.id');
    }
}
