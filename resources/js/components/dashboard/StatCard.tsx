import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  subtitle?: string;
  /** 'auto' colors icon bg based on value thresholds */
  colorMode?: 'default' | 'satisfaction' | 'alert';
  /** numeric raw value for color evaluation */
  rawValue?: number;
  /** optional progress bar (0-100) */
  progress?: number;
}

function getIconStyle(colorMode: string, rawValue?: number) {
  if (colorMode === 'satisfaction' && rawValue !== undefined) {
    if (rawValue >= 80) return { bg: 'bg-success/10', text: 'text-success' };
    if (rawValue >= 60) return { bg: 'bg-warning/10', text: 'text-warning' };
    return { bg: 'bg-destructive/10', text: 'text-destructive' };
  }
  if (colorMode === 'alert' && rawValue !== undefined) {
    if (rawValue > 0) return { bg: 'bg-destructive/10', text: 'text-destructive' };
    return { bg: 'bg-success/10', text: 'text-success' };
  }
  return { bg: 'bg-primary/10', text: 'text-primary' };
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  colorMode = 'default',
  rawValue,
  progress,
}: StatCardProps) {
  const TrendIcon =
    trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;
  const trendColor =
    trend && trend > 0
      ? 'text-success'
      : trend && trend < 0
        ? 'text-destructive'
        : 'text-muted-foreground';

  const iconStyle = getIconStyle(colorMode, rawValue);

  return (
    <Card className="glass-card hover:shadow-md transition-all group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl font-display font-bold tracking-tight">{value}</p>
            {trend !== undefined && (
              <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
                <TrendIcon className="h-3 w-3" />
                <span>
                  {trend > 0 ? '+' : ''}
                  {trend}%
                </span>
                {subtitle && (
                  <span className="text-muted-foreground ml-1 font-normal">{subtitle}</span>
                )}
              </div>
            )}
            {progress !== undefined && (
              <div className="pt-1">
                <Progress value={progress} className="h-1.5" />
              </div>
            )}
          </div>
          <div
            className={cn(
              'p-2.5 rounded-xl transition-transform group-hover:scale-110',
              iconStyle.bg
            )}
          >
            <Icon className={cn('h-5 w-5', iconStyle.text)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
