import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    email: string;
    name: string;
    full_name?: string;
    role: string;
    avatar_url?: string;
    organization_id?: string;
    organization?: any;
    branches?: any[];
    is_active: boolean;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    setUser: (user: User | null) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            setUser: (user) => set({ user, isAuthenticated: !!user }),
            clearAuth: () => set({ user: null, isAuthenticated: false }),
        }),
        { name: 'auth-storage' }
    )
);
