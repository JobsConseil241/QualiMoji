import { Search } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { NotificationDropdown } from '@/components/common/NotificationDropdown';
import { PeriodSelector } from '@/components/common/PeriodSelector';
import { AppBreadcrumb } from '@/components/common/AppBreadcrumb';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-card/95 backdrop-blur-sm flex items-center justify-between px-4 gap-4">
      {/* Skip link */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-primary focus:text-primary-foreground focus:rounded">
        Aller au contenu principal
      </a>

      {/* Left side */}
      <div className="flex items-center gap-3 min-w-0">
        <SidebarTrigger className="shrink-0" aria-label="Basculer le menu" />
        <div className="hidden md:block">
          <AppBreadcrumb />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            className="pl-8 w-56 h-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
            aria-label="Rechercher"
          />
        </div>

        {/* Period selector */}
        <PeriodSelector />

        {/* Dark mode toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <NotificationDropdown />
      </div>
    </header>
  );
}
