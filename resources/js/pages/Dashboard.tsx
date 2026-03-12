import { useState, useEffect, useCallback } from 'react';
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
  fetchDashboardStats, fetchAlerts,
  subscribeFeedbacks, subscribeAlerts,
  type DbAlert,
} from '@/services/dataService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Branch, Alert } from '@/types';

type PeriodValue = 'today' | '7d' | '30d' | '90d' | 'custom';

function periodToApi(period: PeriodValue): string {
  switch (period) {
    case 'today': return '24h';
    case '7d': return '7d';
    case '30d': return '30d';
    case '90d': return '90d';
    default: return '30d';
  }
}

export default function Dashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodValue>('30d');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [alerts, setAlerts] = useState<DbAlert[]>([]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [stats, allAlerts] = await Promise.all([
        fetchDashboardStats(periodToApi(period)),
        fetchAlerts(),
      ]);
      setDashboardData(stats);
      setAlerts(allAlerts);
    } catch (err: any) {
      console.error('Dashboard data load error:', err);
      setError(err.message || 'Erreur de chargement');
      toast({ title: 'Erreur de chargement', description: 'Impossible de récupérer les données du dashboard', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, period]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  useEffect(() => {
    const feedbackSub = subscribeFeedbacks(() => loadData());
    const alertSub = subscribeAlerts(() => loadData());
    return () => { feedbackSub.unsubscribe(); alertSub.unsubscribe(); };
  }, [loadData]);

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

  if (!dashboardData) return null;

  const totalFeedbacks = dashboardData.total_feedbacks ?? 0;
  const satisfactionPct = Math.round(dashboardData.satisfaction_rate ?? 0);
  const satisfactionTrend = Math.round(dashboardData.trend ?? 0);
  const activeAlerts = dashboardData.active_alerts ?? 0;
  const sentimentCounts = dashboardData.sentiment_counts ?? {};

  const sentimentData = [
    { name: 'Très satisfait', value: sentimentCounts.very_happy ?? 0, color: '#16A34A' },
    { name: 'Satisfait', value: sentimentCounts.happy ?? 0, color: '#84CC16' },
    { name: 'Insatisfait', value: sentimentCounts.unhappy ?? 0, color: '#F97316' },
    { name: 'Très insatisfait', value: sentimentCounts.very_unhappy ?? 0, color: '#DC2626' },
  ];

  // Build satisfaction evolution chart from daily_stats
  const dailyStats = dashboardData.daily_stats ?? {};
  const satisfactionByBranch = (() => {
    const entries = Object.entries(dailyStats) as [string, any[]][];
    if (entries.length === 0) return [];
    const sentimentScores: Record<string, number> = { very_happy: 4, happy: 3, unhappy: 2, very_unhappy: 1 };
    return entries
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, sentiments]) => {
        let totalScore = 0;
        let totalCount = 0;
        (sentiments as any[]).forEach((s: any) => {
          const score = sentimentScores[s.sentiment] || 3;
          totalScore += score * s.count;
          totalCount += s.count;
        });
        const avg = totalCount > 0 ? Math.round((totalScore / totalCount) * 10) / 10 : 0;
        return { date: format(new Date(date), 'dd MMM', { locale: fr }), 'Score moyen': avg };
      });
  })();

  // Branch ranking from branch_performance
  const branchPerformance: any[] = dashboardData.branch_performance ?? [];
  const branchList: Branch[] = branchPerformance
    .map((bp: any) => ({
      id: bp.branch_id,
      name: bp.branch_name,
      city: '',
      region: '',
      satisfactionScore: Math.round((bp.satisfaction_rate / 100) * 5 * 10) / 10,
      totalFeedbacks: bp.total_feedbacks,
      activeAlerts: 0,
      trend: 'stable' as const,
      responseRate: bp.satisfaction_rate,
    }))
    .sort((a, b) => b.satisfactionScore - a.satisfactionScore);

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
            Vue d'ensemble de la qualité de service · {totalFeedbacks} feedbacks · {branchPerformance.length} agences
          </p>
        </div>
        <PeriodSelector onChange={(v) => setPeriod(v as PeriodValue)} />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Satisfaction globale" value={`${satisfactionPct}%`} icon={Star} trend={satisfactionTrend} subtitle="vs période précédente" colorMode="satisfaction" rawValue={satisfactionPct} />
        <StatCard title="Total feedbacks" value={totalFeedbacks.toLocaleString()} icon={MessageSquare} subtitle="sur la période" />
        <StatCard title="Alertes actives" value={activeAlerts} icon={AlertTriangle} trend={0} subtitle="alertes non résolues" colorMode="alert" rawValue={activeAlerts} />
        <StatCard title="Agences actives" value={branchPerformance.length} icon={UserCheck} subtitle="avec feedbacks" />
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
                <EmptyState type="feedbacks" title="Aucune donnée sur cette période" description="Collectez des feedbacks pour voir l'évolution de la satisfaction." />
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
