import { cn } from '@/lib/utils';
import { Lock, TrendingUp, TrendingDown, Minus, Settings2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface KpiGaugeProps {
  label: string;
  value: number;
  target: number;
  critical: number;
  unit: string;
  status: 'on_target' | 'warning' | 'critical';
  isCustom?: boolean;
  isMandatory?: boolean;
  direction?: 'higher_is_better' | 'lower_is_better';
}

const statusConfig = {
  on_target: { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success', label: 'Atteint' },
  warning: { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning', label: 'Attention' },
  critical: { bg: 'bg-destructive/10', border: 'border-destructive/30', text: 'text-destructive', label: 'Critique' },
};

export function KpiGauge({ label, value, target, critical, unit, status, isCustom, isMandatory, direction }: KpiGaugeProps) {
  const config = statusConfig[status];
  const lowerIsBetter = direction === 'lower_is_better';

  // Progress calculation (0-100)
  let progress: number;
  if (lowerIsBetter) {
    progress = target > 0 ? Math.max(0, Math.min(100, ((target * 2 - value) / (target * 2)) * 100)) : 0;
  } else {
    progress = target > 0 ? Math.max(0, Math.min(100, (value / target) * 100)) : 0;
  }

  return (
    <div className={cn('rounded-lg border p-4 space-y-3', config.bg, config.border)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {isMandatory && (
            <Tooltip>
              <TooltipTrigger>
                <Lock className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>KPI obligatoire (non modifiable)</TooltipContent>
            </Tooltip>
          )}
          {isCustom && (
            <Tooltip>
              <TooltipTrigger>
                <Settings2 className="h-3 w-3 text-primary" />
              </TooltipTrigger>
              <TooltipContent>Cible personnalisée pour cette agence</TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', config.bg, config.text)}>
          {config.label}
        </span>
      </div>

      <div className="flex items-end gap-2">
        <span className={cn('text-2xl font-display font-bold', config.text)}>
          {value}{unit}
        </span>
        <span className="text-xs text-muted-foreground mb-1">
          / cible {target}{unit}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', {
            'bg-success': status === 'on_target',
            'bg-warning': status === 'warning',
            'bg-destructive': status === 'critical',
          })}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Critique: {critical}{unit}</span>
        <span>Cible: {target}{unit}</span>
      </div>
    </div>
  );
}
