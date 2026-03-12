import { useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown, Minus, Trophy, Medal, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Branch } from '@/types';

interface BranchRankingProps {
  branches: Branch[];
}

const TrendIcon = { up: ArrowUp, down: ArrowDown, stable: Minus };
const trendColor = { up: 'text-success', down: 'text-destructive', stable: 'text-muted-foreground' };

const medals = [
  { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { icon: Medal, color: 'text-slate-400', bg: 'bg-slate-400/10' },
  { icon: Award, color: 'text-amber-700', bg: 'bg-amber-700/10' },
];

export function BranchRanking({ branches }: BranchRankingProps) {
  const sorted = [...branches].sort((a, b) => b.satisfactionScore - a.satisfactionScore);
  const navigate = useNavigate();

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display">Classement des agences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {sorted.map((branch, i) => {
          const Icon = TrendIcon[branch.trend];
          const medal = i < 3 ? medals[i] : null;
          const MedalIcon = medal?.icon;
          const scorePct = (branch.satisfactionScore / 5) * 100;

          return (
            <button
              key={branch.id}
              onClick={() => navigate(`/branches/${branch.id}`)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-muted/60',
                i < 3 && 'bg-muted/30'
              )}
            >
              {/* Rank */}
              {medal && MedalIcon ? (
                <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0', medal.bg)}>
                  <MedalIcon className={cn('h-4 w-4', medal.color)} />
                </div>
              ) : (
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground shrink-0">
                  <span className="text-xs font-bold">{i + 1}</span>
                </div>
              )}

              {/* Branch info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{branch.name}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm font-display font-bold">{branch.satisfactionScore.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">/5</span>
                    <Icon className={cn('h-3.5 w-3.5', trendColor[branch.trend])} />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <Progress value={scorePct} className="h-1.5 flex-1" />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {branch.totalFeedbacks} avis
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
