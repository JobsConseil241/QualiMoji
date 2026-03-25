import { useState, useEffect } from 'react';
import { Loader2, Target, TrendingUp, Users, Bell, AlertTriangle, MessageSquare, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KpiGauge } from './KpiGauge';
import { fetchBranchKpis } from '@/services/dataService';
import { cn } from '@/lib/utils';

interface BranchKpiDashboardProps {
  branchId: string;
  period?: string;
}

const KPI_LABELS: Record<string, { label: string; icon: any; category: string }> = {
  satisfaction_rate: { label: 'Score de satisfaction', icon: Target, category: 'satisfaction' },
  nps: { label: 'NPS (Net Promoter Score)', icon: TrendingUp, category: 'satisfaction' },
  dissatisfaction_rate: { label: "Taux d'insatisfaction", icon: AlertTriangle, category: 'satisfaction' },
  satisfaction_evolution: { label: 'Evolution satisfaction', icon: TrendingUp, category: 'satisfaction' },
  contact_rate: { label: 'Taux de contact fourni', icon: Phone, category: 'engagement' },
  callback_rate: { label: 'Taux de demande de rappel', icon: Phone, category: 'engagement' },
  avg_alert_resolution_hours: { label: "Delai traitement d'alerte", icon: Bell, category: 'reactivity' },
  alert_resolution_rate: { label: "Taux d'alertes traitees", icon: Bell, category: 'reactivity' },
  follow_up_rate: { label: 'Taux de relance', icon: MessageSquare, category: 'reactivity' },
  insatisfaction_resolution_rate: { label: 'Taux resolution insatisfactions', icon: Target, category: 'reactivity' },
  avg_insatisfaction_resolution_hours: { label: 'Delai resolution insatisfactions', icon: Bell, category: 'reactivity' },
  feedbacks_per_month: { label: 'Feedbacks par mois', icon: Users, category: 'volume' },
  distinct_issues_count: { label: "Raisons d'insatisfaction identifiees", icon: AlertTriangle, category: 'volume' },
};

const CATEGORY_LABELS: Record<string, string> = {
  satisfaction: 'Satisfaction Client',
  engagement: 'Engagement & Collecte',
  reactivity: 'Reactivite Operationnelle',
  volume: 'Volume & Couverture',
};

export function BranchKpiDashboard({ branchId, period = '30d' }: BranchKpiDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await fetchBranchKpis(branchId, period);
        setData(result);
      } catch (err) {
        console.error('Failed to load branch KPIs:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [branchId, period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.evaluations) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune donnee KPI disponible
      </div>
    );
  }

  const evaluations = data.evaluations;
  const kpis = data.kpis;

  // Group by category
  const categories: Record<string, string[]> = {};
  for (const key of Object.keys(evaluations)) {
    const cat = KPI_LABELS[key]?.category || 'other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(key);
  }

  // Summary stats
  const total = Object.keys(evaluations).length;
  const onTarget = Object.values(evaluations).filter((e: any) => e.status === 'on_target').length;
  const warnings = Object.values(evaluations).filter((e: any) => e.status === 'warning').length;
  const criticals = Object.values(evaluations).filter((e: any) => e.status === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-display font-bold">{total}</p>
            <p className="text-xs text-muted-foreground">KPIs suivis</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-display font-bold text-success">{onTarget}</p>
            <p className="text-xs text-muted-foreground">Atteints</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-display font-bold text-warning">{warnings}</p>
            <p className="text-xs text-muted-foreground">Attention</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-display font-bold text-destructive">{criticals}</p>
            <p className="text-xs text-muted-foreground">Critiques</p>
          </CardContent>
        </Card>
      </div>

      {/* KPIs by category */}
      {Object.entries(categories).map(([cat, keys]) => (
        <Card key={cat} className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">{CATEGORY_LABELS[cat] || cat}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {keys.map(key => {
                const ev = evaluations[key];
                const meta = KPI_LABELS[key];
                if (!ev || !meta) return null;

                const direction = ['dissatisfaction_rate', 'avg_alert_resolution_hours', 'avg_insatisfaction_resolution_hours'].includes(key)
                  ? 'lower_is_better'
                  : 'higher_is_better';

                return (
                  <KpiGauge
                    key={key}
                    label={meta.label}
                    value={ev.value}
                    target={ev.target}
                    critical={ev.critical}
                    unit={ev.unit}
                    status={ev.status}
                    isCustom={ev.is_custom}
                    direction={direction}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Top issues */}
      {kpis?.top_issues && Object.keys(kpis.top_issues).length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">Top Raisons d'insatisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(kpis.top_issues).map(([label, count]: [string, any]) => {
                const total = Object.values(kpis.top_issues as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={label} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{label}</span>
                        <span className="text-muted-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-destructive/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
