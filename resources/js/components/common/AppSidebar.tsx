import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchUnreadAlertCount } from '@/services/dataService';
import api from '@/lib/api';
import {
  LayoutDashboard,
  Building2,
  Bell,
  FileBarChart,
  Settings,
  LogOut,
  Shield,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const baseNavItems = [
  { title: 'Tableau de bord', url: '/', icon: LayoutDashboard },
  { title: 'Agences', url: '/branches', icon: Building2 },
  { title: 'Alertes', url: '/alerts', icon: Bell },
  { title: 'Rapports', url: '/reports', icon: FileBarChart },
  { title: 'Paramètres', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user, logout } = useAuth();
  const [alertCount, setAlertCount] = useState(0);
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>('QualityHub');

  useEffect(() => {
    async function loadAlertCount() {
      try {
        const count = await fetchUnreadAlertCount();
        setAlertCount(count ?? 0);
      } catch {
        // silent
      }
    }
    loadAlertCount();
    const interval = setInterval(loadAlertCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadOrg() {
      try {
        const { data } = await api.get('/settings/organization');
        const org = data?.organization ?? data;
        if (org?.logo_url) setOrgLogo(org.logo_url);
        if (org?.name) setOrgName(org.name);
      } catch {
        // silent
      }
    }
    loadOrg();
  }, []);

  const navItems = baseNavItems.map((item) => ({
    ...item,
    badge: item.title === 'Alertes' ? alertCount : 0,
  }));

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  const roleLabel = user?.role?.replace(/_/g, ' ') || '';

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent>
        {/* Logo */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-6 mb-2">
            <div className="flex items-center gap-2.5">
              {orgLogo ? (
                <img src={orgLogo} alt="" className="h-8 w-8 rounded-lg object-contain shrink-0" onError={() => setOrgLogo(null)} />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary shrink-0">
                  <Shield className="h-4.5 w-4.5 text-sidebar-primary-foreground" />
                </div>
              )}
              {!collapsed && (
                <div>
                  <span className="font-display text-sm font-bold text-sidebar-accent-foreground tracking-tight leading-none block">
                    {orgName}
                  </span>
                  <span className="text-[10px] text-sidebar-foreground/60 leading-none">
                    Feedback Rating Solution
                  </span>
                </div>
              )}
            </div>
          </SidebarGroupLabel>

          {/* Navigation */}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <span className="flex-1 flex items-center justify-between">
                          <span>{item.title}</span>
                          {item.badge > 0 && (
                            <Badge className="h-5 min-w-5 px-1.5 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground border-0">
                              {item.badge}
                            </Badge>
                          )}
                        </span>
                      )}
                      {collapsed && item.badge > 0 && (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User section */}
      <SidebarFooter className="p-3">
        <Separator className="mb-3 bg-sidebar-border" />
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-1 mb-2">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate leading-tight">
                {user?.name}
              </p>
              <p className="text-[11px] text-sidebar-foreground/60 capitalize leading-tight">
                {roleLabel}
              </p>
            </div>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={logout}
              className="hover:bg-destructive/10 text-sidebar-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Déconnexion</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
