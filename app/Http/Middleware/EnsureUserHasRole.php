<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $userRole = $user->userRole?->role;

        if (!$userRole || !in_array($userRole, $roles)) {
            return response()->json(['message' => 'Forbidden. Required role: ' . implode(' or ', $roles)], 403);
        }

        return $next($request);
    }
}
