import { useState, useRef, useEffect } from 'react';
import { Bell, Check, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { mockAlerts } from '@/data/mockData';
import type { Alert } from '@/types';

const iconMap = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
};

const colorMap = {
  critical: 'text-destructive',
  warning: 'text-warning',
  info: 'text-info',
};

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAsRead = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
  };

  const markAllRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground border-2 border-card">
            {unreadCount}
          </Badge>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-display font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
                <Check className="h-3 w-3 mr-1" />
                Tout lire
              </Button>
            )}
          </div>

          <ScrollArea className="max-h-80">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune notification</p>
            ) : (
              alerts.map((alert, i) => {
                const Icon = iconMap[alert.type];
                return (
                  <div key={alert.id}>
                    <button
                      onClick={() => markAsRead(alert.id)}
                      className={cn(
                        'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3',
                        !alert.isRead && 'bg-primary/5'
                      )}
                    >
                      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', colorMap[alert.type])} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium truncate">{alert.branchName}</span>
                          {!alert.isRead && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {alert.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {new Date(alert.createdAt).toLocaleString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </button>
                    {i < alerts.length - 1 && <Separator />}
                  </div>
                );
              })
            )}
          </ScrollArea>

          <div className="border-t border-border px-4 py-2.5">
            <Button variant="ghost" size="sm" className="w-full text-xs text-primary h-7" asChild>
              <a href="/alerts">Voir toutes les alertes →</a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
