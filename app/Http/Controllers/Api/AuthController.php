<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'full_name' => 'nullable|string|max:255',
            'organization_name' => 'nullable|string|max:255',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'full_name' => $validated['full_name'] ?? $validated['name'],
            'is_active' => true,
        ]);

        // Create organization if provided
        if (!empty($validated['organization_name'])) {
            $org = Organization::create(['name' => $validated['organization_name']]);
            $user->update(['organization_id' => $org->id]);
        }

        // Assign default role
        UserRole::create([
            'user_id' => $user->id,
            'role' => 'admin',
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user->load('userRole', 'organization'),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($validated, $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'email' => ['Les identifiants sont incorrects.'],
            ]);
        }

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        $user = Auth::user();
        $user->update(['last_sign_in_at' => now()]);

        return response()->json([
            'user' => $user->load('userRole', 'organization'),
        ]);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Déconnexion réussie']);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
        ]);

        // In a real app, send password reset email here
        // For now, just return success
        return response()->json(['message' => 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.']);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('userRole', 'organization', 'branchAssignments.branch');

        return response()->json(['user' => $user]);
    }

    public function updateProfile(Request $request)
    {
        $validated = $request->validate([
            'full_name' => 'nullable|string|max:255',
            'avatar_url' => 'nullable|string|url|max:2048',
        ]);

        $request->user()->update($validated);

        return response()->json(['user' => $request->user()->fresh()->load('userRole', 'organization')]);
    }

    public function updatePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->update(['password' => Hash::make($validated['password'])]);

        return response()->json(['message' => 'Password updated successfully']);
    }
}
