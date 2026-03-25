<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\KpiConfig;
use App\Services\KpiCalculator;
use Illuminate\Http\Request;

class KpiController extends Controller
{
    public function __construct(
        private KpiCalculator $calculator
    ) {}

    /**
     * GET /api/kpis/organization
     * KPIs agrégés pour toute l'organisation.
     */
    public function organization(Request $request)
    {
        $user = $request->user();
        $period = $request->get('period', '30d');

        $data = $this->calculator->forOrganization($user->organization_id, $period);

        return response()->json($data);
    }

    /**
     * GET /api/kpis/branches/{branch}
     * KPIs détaillés pour une agence avec évaluation par rapport aux cibles.
     */
    public function branch(Request $request, Branch $branch)
    {
        $user = $request->user();

        // Vérifier que l'utilisateur a accès à cette agence
        if ($branch->organization_id !== $user->organization_id) {
            abort(403);
        }

        if (!$user->hasRole('admin') && !$user->hasRole('owner')) {
            $userBranchIds = $user->branches()->pluck('branches.id');
            if (!$userBranchIds->contains($branch->id)) {
                abort(403);
            }
        }

        $period = $request->get('period', '30d');
        $data = $this->calculator->evaluate($branch, $period);

        return response()->json([
            'branch' => $branch,
            ...$data,
        ]);
    }

    /**
     * GET /api/kpis/branches/{branch}/targets
     * Cibles configurées pour une agence.
     */
    public function targets(Request $request, Branch $branch)
    {
        $user = $request->user();

        if ($branch->organization_id !== $user->organization_id) {
            abort(403);
        }

        $targets = $this->calculator->getTargets($branch);

        return response()->json(['targets' => $targets]);
    }

    /**
     * POST /api/kpis/branches/{branch}/targets
     * Sauvegarder les cibles personnalisées d'une agence (manager ou admin).
     */
    public function saveTargets(Request $request, Branch $branch)
    {
        $user = $request->user();

        if ($branch->organization_id !== $user->organization_id) {
            abort(403);
        }

        // Les staff ne peuvent modifier que les KPIs non-obligatoires
        $isAdmin = $user->hasRole('admin') || $user->hasRole('owner');

        $validated = $request->validate([
            'targets' => 'required|array',
            'targets.*.key' => 'required|string',
            'targets.*.target' => 'required|numeric',
            'targets.*.critical' => 'required|numeric',
        ]);

        $saved = [];
        foreach ($validated['targets'] as $targetData) {
            $key = $targetData['key'];

            // Vérifier si ce KPI est obligatoire
            if (!$isAdmin) {
                $mandatory = KpiConfig::where('organization_id', $user->organization_id)
                    ->whereNull('branch_id')
                    ->where('config_key', $key)
                    ->first();

                if ($mandatory && ($mandatory->config_value['is_mandatory'] ?? false)) {
                    continue; // Skip mandatory KPIs for non-admin users
                }
            }

            $saved[] = KpiConfig::updateOrCreate(
                [
                    'organization_id' => $user->organization_id,
                    'branch_id' => $branch->id,
                    'config_key' => $key,
                ],
                [
                    'user_id' => $user->id,
                    'config_value' => [
                        'target' => $targetData['target'],
                        'critical' => $targetData['critical'],
                    ],
                ]
            );
        }

        return response()->json(['targets' => $saved]);
    }

    /**
     * POST /api/kpis/organization/targets
     * Sauvegarder les cibles globales (admin uniquement) avec flag obligatoire.
     */
    public function saveOrgTargets(Request $request)
    {
        $user = $request->user();

        if (!$user->hasRole('admin') && !$user->hasRole('owner')) {
            abort(403, 'Seuls les administrateurs peuvent modifier les cibles globales.');
        }

        $validated = $request->validate([
            'targets' => 'required|array',
            'targets.*.key' => 'required|string',
            'targets.*.target' => 'required|numeric',
            'targets.*.critical' => 'required|numeric',
            'targets.*.is_mandatory' => 'boolean',
        ]);

        $saved = [];
        foreach ($validated['targets'] as $targetData) {
            $saved[] = KpiConfig::updateOrCreate(
                [
                    'organization_id' => $user->organization_id,
                    'branch_id' => null,
                    'config_key' => $targetData['key'],
                ],
                [
                    'user_id' => $user->id,
                    'config_value' => [
                        'target' => $targetData['target'],
                        'critical' => $targetData['critical'],
                        'is_mandatory' => $targetData['is_mandatory'] ?? false,
                    ],
                ]
            );
        }

        return response()->json(['targets' => $saved]);
    }
}
