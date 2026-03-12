import { Outlet, useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/common/AppSidebar';
import { AppHeader } from '@/components/common/AppHeader';
import { useInactivity } from '@/hooks/useInactivity';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';

const INACTIVITY_TIMEOUT = 15 * 60; // 15 minutes in seconds

export function DashboardLayout() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useInactivity({
    timeout: INACTIVITY_TIMEOUT,
    onInactive: async () => {
      try {
        await api.post('/auth/logout');
      } catch {
        // session already expired
      }
      clearAuth();
      navigate('/login', { replace: true });
    },
    enabled: true,
  });

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
