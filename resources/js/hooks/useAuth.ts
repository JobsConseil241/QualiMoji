import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import api, { getCsrfCookie } from '@/lib/api';

export function useAuth() {
    const { user, isAuthenticated, setUser, clearAuth } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            const { data } = await api.get('/auth/me');
            setUser(data.user);
        } catch {
            clearAuth();
        } finally {
            setIsLoading(false);
        }
    }, [setUser, clearAuth]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = async (email: string, password: string) => {
        await getCsrfCookie();
        const { data } = await api.post('/auth/login', { email, password });
        setUser(data.user);
        return data.user;
    };

    const logout = async () => {
        await api.post('/auth/logout');
        clearAuth();
    };

    const resetPassword = async (email: string) => {
        await getCsrfCookie();
        await api.post('/auth/forgot-password', { email });
    };

    return { user, isAuthenticated, isLoading, login, logout, resetPassword, checkAuth };
}
