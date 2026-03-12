import { useState, useEffect, useCallback, useMemo } from 'react';
import { Star, MessageSquare, AlertTriangle, UserCheck, RefreshCw } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { BranchRanking } from '@/components/dashboard/BranchRanking';
import { RecentAlerts } from '@/components/dashboard/RecentAlerts';
import { SatisfactionChart } from '@/components/dashboard/SatisfactionChart';
import { SentimentChart } from '@/components/dashboard/SentimentChart';
import { DashboardSkeleton } from '@/components/common/Skeletons';
import { EmptyState } from '@/components/common/EmptyState';
import { PeriodSelector } from '@/components/common/PeriodSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import WhatsAppJournal from '@/components/dashboard/WhatsAppJournal';
import { useToast } from '@/hooks/use-toast';
import {
  fetchBranches, fetchFeedbacks, fetchAlerts,
  computeBranchStats, subscribeFeedbacks, subscribeAlerts,
  type DbBranch, type DbFeedback, type DbAlert,
} from '@/services/dataService';
import { format, startOfWeek, subDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Branch, Alert } from '@/types';

type PeriodValue = 'today' | '7d' | '30d' | '90d' | 'custom';

function getPeriodDays(period: PeriodValue): number | null {
  switch (period) {
    case 'today': return 1;
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    default: return null;
  }
}

function getPeriodSince(period: PeriodValue): Date | null {
  const now = new Date();
  const days = getPeriodDays(period);
  if (days === null) return null;
  return days === 1 ? startOfDay(now) : subDays(now, days);
}

function getPreviousPeriodRange(period: PeriodValue): { since: Date; until: Date } | null {
  const days = getPeriodDays(period);
  if (days === null) return null;
  const now = new Date();
  const currentStart = days === 1 ? startOfDay(now) : subDays(now, days);
  const previousStart = days === 1 ? subDays(startOfDay(now), 1) : subDays(now, days * 2);
  return { since: previousStart, until: currentStart };
}

export default function Dashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<DbBranch[]>([]);
  const [feedbacks, setFeedbacks] = useState<DbFeedback[]>([]);
  const [alerts, setAlerts] = useState<DbAlert[]>([]);
  const [period, setPeriod] = useState<PeriodValue>('30d');

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [b, f, a] = await Promise.all([
        fetchBranches(),
        fetchFeedbacks(),
        fetchAlerts(),
      ]);
      setBranches(b);
      setFeedbacks(f);
      setAlerts(a);
    } catch (err: any) {
      console.error('Dashboard data load error:', err);
      setError(err.message || 'Erreur de chargement');
      toast({ title: 'Erreur de chargement', description: 'Impossible de récupérer les données du dashboard', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
    const feedbackSub = subscribeFeedbacks(() => loadData());
    const alertSub = subscribeAlerts(() => loadData());
    return () => { feedbackSub.unsubscribe(); alertSub.unsubscribe(); };
  }, [loadData]);

  // Filter feedbacks by period
  const filteredFeedbacks = useMemo(() => {
    const since = getPeriodSince(period);
    if (!since) return feedbacks;
    return feedbacks.filter(f => new Date(f.created_at) >= since);
  }, [feedbacks, period]);

  // Previous period feedbacks for trend comparison
  const prevFeedbacks = useMemo(() => {
    const range = getPreviousPeriodRange(period);
    if (!range) return [];
    return feedbacks.filter(f => {
      const d = new Date(f.created_at);
      return d >= range.since && d < range.until;
    });
  }, [feedbacks, period]);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl mb-4">⚠️</span>
        <h2 className="text-lg font-display font-bold mb-2">Erreur de chargement</h2>
        <p className="text-sm text-muted-foreground mb-2">{error}</p>
        <Button onClick={loadData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>
      </div>
    );
  }

  // Compute stats from filtered feedbacks
  const totalFeedbacks = filteredFeedbacks.length;
  const activeAlerts = alerts.filter(a => a.status === 'active').length;

  const sentimentScores: Record<string, number> = { very_happy: 5, happy: 4, neutral: 3, unhappy: 2, very_unhappy: 1 };
  const avgSatisfaction = totalFeedbacks > 0
    ? filteredFeedbacks.reduce((s, f) => s + (sentimentScores[f.sentiment] || 3), 0) / totalFeedbacks
    : 0;
  const satisfactionPct = Math.round((avgSatisfaction / 5) * 100);

  // Previous period stats for trends
  const prevTotal = prevFeedbacks.length;
  const prevAvg = prevTotal > 0
    ? prevFeedbacks.reduce((s, f) => s + (sentimentScores[f.sentiment] || 3), 0) / prevTotal
    : 0;
  const prevSatPct = Math.round((prevAvg / 5) * 100);

  function trendPct(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  const satisfactionTrend = trendPct(satisfactionPct, prevSatPct);
  const feedbacksTrend = trendPct(totalFeedbacks, prevTotal);

  const sentimentCounts = {
    very_happy: filteredFeedbacks.filter(f => f.sentiment === 'very_happy').length,
    happy: filteredFeedbacks.filter(f => f.sentiment === 'happy').length,
    neutral: filteredFeedbacks.filter(f => f.sentiment === 'neutral').length,
    unhappy: filteredFeedbacks.filter(f => f.sentiment === 'unhappy').length,
    very_unhappy: filteredFeedbacks.filter(f => f.sentiment === 'very_unhappy').length,
  };
  const sentimentData = [
    { name: 'Très satisfait', value: sentimentCounts.very_happy, color: '#16A34A' },
    { name: 'Satisfait', value: sentimentCounts.happy, color: '#84CC16' },
    { name: 'Neutre', value: sentimentCounts.neutral, color: '#EAB308' },
    { name: 'Insatisfait', value: sentimentCounts.unhappy, color: '#F97316' },
    { name: 'Très insatisfait', value: sentimentCounts.very_unhappy, color: '#DC2626' },
  ];

  // Build satisfaction-by-branch evolution from filtered feedbacks
  const sentimentScoreMap: Record<string, number> = { very_happy: 5, happy: 4, neutral: 3, unhappy: 2, very_unhappy: 1 };
  const satisfactionByBranch = (() => {
    const weekMap = new Map<string, Map<string, number[]>>();
    filteredFeedbacks.forEach(f => {
      const weekKey = format(startOfWeek(new Date(f.created_at), { weekStartsOn: 1 }), 'dd MMM', { locale: fr });
      if (!weekMap.has(weekKey)) weekMap.set(weekKey, new Map());
      const branchScores = weekMap.get(weekKey)!;
      const branch = branches.find(b => b.id === f.branch_id);
      if (!branch) return;
      if (!branchScores.has(branch.name)) branchScores.set(branch.name, []);
      branchScores.get(branch.name)!.push(sentimentScoreMap[f.sentiment] || 3);
    });
    return Array.from(weekMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, branchMap]) => {
        const row: Record<string, any> = { date };
        branchMap.forEach((scores, name) => {
          row[name] = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
        });
        return row;
      });
  })();

  const branchList: Branch[] = branches.map(b => {
    const stats = computeBranchStats(b, filteredFeedbacks);
    return {
      id: b.id, name: b.name, city: b.city || '', address: b.address || undefined,
      region: b.region || '', satisfactionScore: stats.satisfactionScore,
      totalFeedbacks: stats.totalFeedbacks,
      activeAlerts: alerts.filter(a => a.branch_name === b.name && a.status === 'active').length,
      trend: 'stable' as const, responseRate: 0,
    };
  });

  const alertList: Alert[] = alerts.slice(0, 10).map(a => ({
    id: a.id, branchId: a.branch_id, branchName: a.branch_name,
    type: (a.type === 'critical' ? 'critical' : a.type === 'warning' ? 'warning' : 'info') as Alert['type'],
    message: a.message, isRead: a.is_read, createdAt: a.created_at,
  }));

  return (
    <div className="space-y-6" id="main-content">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vue d'ensemble de la qualité de service · {totalFeedbacks} feedbacks · {branches.length} agences
          </p>
        </div>
        <PeriodSelector onChange={(v) => setPeriod(v as PeriodValue)} />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Satisfaction globale" value={`${satisfactionPct}%`} icon={Star} trend={satisfactionTrend} subtitle="vs période précédente" colorMode="satisfaction" rawValue={satisfactionPct} />
        <StatCard title="Total feedbacks" value={totalFeedbacks.toLocaleString()} icon={MessageSquare} trend={feedbacksTrend} subtitle="vs période précédente" />
        <StatCard title="Alertes actives" value={activeAlerts} icon={AlertTriangle} trend={0} subtitle="alertes non résolues" colorMode="alert" rawValue={activeAlerts} />
        <StatCard title="Agences actives" value={branches.length} icon={UserCheck} subtitle="connectées" />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {satisfactionByBranch.length > 0 ? (
            <SatisfactionChart data={satisfactionByBranch} />
          ) : (
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display">Évolution de la satisfaction</CardTitle>
              </CardHeader>
              <CardContent>
                <EmptyState type="feedbacks" title="Aucune donnée sur cette période" description="Collectez des feedbacks pour voir l'évolution de la satisfaction par agence." />
              </CardContent>
            </Card>
          )}
        </div>
        <div className="lg:col-span-2">
          {totalFeedbacks > 0 ? (
            <SentimentChart data={sentimentData} />
          ) : (
            <EmptyState type="feedbacks" />
          )}
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {branchList.length > 0 ? (
          <BranchRanking branches={branchList} />
        ) : (
          <EmptyState type="generic" title="Aucune agence" description="Ajoutez des agences dans les paramètres." />
        )}
        {alertList.length > 0 ? (
          <RecentAlerts alerts={alertList} />
        ) : (
          <EmptyState type="alerts" />
        )}
      </div>

      <WhatsAppJournal />
    </div>
  );
}
