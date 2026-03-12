import { useNavigate } from 'react-router-dom';
import { AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Alert } from '@/types';

interface RecentAlertsProps {
  alerts: Alert[];
}

const alertConfig = {
  critical: { icon: AlertTriangle, label: 'Critique', dotColor: 'bg-destructive', textColor: 'text-destructive' },
  warning: { icon: AlertCircle, label: 'Attention', dotColor: 'bg-warning', textColor: 'text-warning' },
  info: { icon: Info, label: 'Info', dotColor: 'bg-info', textColor: 'text-info' },
};

export function RecentAlerts({ alerts }: RecentAlertsProps) {
  const navigate = useNavigate();

  return (
    <Card className="glass-card flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-display">Alertes récentes</CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {alerts.filter((a) => !a.isRead).length} non lues
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-1">
        {alerts.slice(0, 5).map((alert) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;
          return (
            <button
              key={alert.id}
              onClick={() => navigate('/alerts')}
              className={cn(
                'w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all hover:bg-muted/50',
                !alert.isRead && 'bg-muted/30'
              )}
            >
              <div className={cn('mt-0.5 p-1.5 rounded-lg shrink-0', `${config.dotColor}/10`)}>
                <Icon className={cn('h-3.5 w-3.5', config.textColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium truncate">{alert.branchName}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[9px] px-1.5 py-0 h-4 border-current/30 shrink-0',
                      config.textColor
                    )}
                  >
                    {config.label}
                  </Badge>
                  {!alert.isRead && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{alert.message}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {new Date(alert.createdAt).toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 mt-1 shrink-0" />
            </button>
          );
        })}
      </CardContent>
      <div className="px-4 pb-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => navigate('/alerts')}
        >
          Voir toutes les alertes
        </Button>
      </div>
    </Card>
  );
}
