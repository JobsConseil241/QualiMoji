import { useState, useCallback, useEffect } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileBarChart, Download, FileSpreadsheet, FileText, Calendar as CalendarIcon,
  Clock, Filter, ChevronRight, Loader2, CheckSquare, Building2, CalendarClock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';
import { fetchBranches, fetchFeedbacks, fetchAlerts, fetchDashboardStats } from '@/services/dataService';
import { useAuth } from '@/hooks/useAuth';
import {
  buildReportData, exportToExcel, exportToPDF,
  type ReportHistoryEntry,
} from '@/services/exportService';
import ScheduleManager from '@/components/reports/ScheduleManager';

/* ─── History mock ─── */
const initialHistory: ReportHistoryEntry[] = [
  { id: '1', title: 'Rapport Journalier — 02 Mars 2026', type: 'Journalier', generatedAt: '2026-03-02T18:00:00', period: '02/03/2026', format: 'pdf' },
  { id: '2', title: 'Rapport Hebdomadaire — S09 2026', type: 'Hebdomadaire', generatedAt: '2026-03-01T09:00:00', period: '24/02 — 02/03/2026', format: 'excel' },
  { id: '3', title: 'Rapport Mensuel — Février 2026', type: 'Mensuel', generatedAt: '2026-03-01T08:00:00', period: '01/02 — 28/02/2026', format: 'pdf' },
];

export default function Reports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('predefined');
  const [dailyDate, setDailyDate] = useState<Date>(new Date());
  const [weeklyDate, setWeeklyDate] = useState<Date>(new Date());
  const [monthlyDate, setMonthlyDate] = useState<Date>(new Date());
  const [history, setHistory] = useState<ReportHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  // Custom report state
  const [customStart, setCustomStart] = useState<Date>(subDays(new Date(), 30));
  const [customEnd, setCustomEnd] = useState<Date>(new Date());
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedSentiments, setSelectedSentiments] = useState<string[]>(['very_happy', 'happy', 'unhappy', 'very_unhappy']);
  const [includeGlobalMetrics, setIncludeGlobalMetrics] = useState(true);
  const [includeBranchDetail, setIncludeBranchDetail] = useState(true);
  const [includeFeedbacks, setIncludeFeedbacks] = useState(true);
  const [includeAlerts, setIncludeAlerts] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [orgName, setOrgName] = useState('');

  // Load branches and report data
  useEffect(() => {
    (async () => {
      try {
        const [branchList, stats, feedbacks, alerts, branding] = await Promise.all([
          fetchBranches(),
          fetchDashboardStats('30d'),
          fetchFeedbacks({ per_page: 2000 }),
          fetchAlerts({ per_page: 500 }),
          api.get('/branding').then(r => r.data).catch(() => null),
        ]);
        setBranches((branchList as any[]).map((b: any) => ({ id: b.id, name: b.name })));
        setReportData({ branches: branchList, stats, feedbacks, alerts });
        if (branding?.name) setOrgName(branding.name);
      } catch {}
    })();
  }, []);

  // Load history from database
  const fetchHistory = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/reports/history', { params: { limit: 50 } });
      const items = data?.data ?? (Array.isArray(data) ? data : []);
      setHistory(items.map((d: any) => ({
        id: d.id,
        title: d.title,
        type: d.report_type,
        generatedAt: d.created_at,
        period: `${format(new Date(d.period_start), 'dd/MM/yyyy')} — ${format(new Date(d.period_end), 'dd/MM/yyyy')}`,
        format: d.format as 'excel' | 'pdf',
      })));
    } catch {
      // silent
    }
    setHistoryLoading(false);
  }, [user]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const addHistory = useCallback(async (title: string, type: string, start: Date, end: Date, fmt: 'excel' | 'pdf') => {
    if (!user) return;
    try {
      await api.post('/reports/history', {
        title,
        report_type: type,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
        format: fmt,
        status: 'generated',
      });
      fetchHistory();
    } catch {
      // silent
    }
  }, [user, fetchHistory]);

  const generate = useCallback(async (
    key: string,
    title: string,
    type: 'daily' | 'weekly' | 'monthly' | 'custom',
    start: Date,
    end: Date,
    fmt: 'excel' | 'pdf',
    options?: any,
  ) => {
    setGenerating(key);
    // Simulate slight delay for UX
    await new Promise((r) => setTimeout(r, 600));
    try {
      const data = buildReportData(title, type, start, end, reportData ?? {}, options);
      if (fmt === 'excel') {
        exportToExcel(data, title.replace(/\s+/g, '_'), orgName);
      } else {
        exportToPDF(data, type, orgName);
      }
      addHistory(title, type === 'daily' ? 'Journalier' : type === 'weekly' ? 'Hebdomadaire' : type === 'monthly' ? 'Mensuel' : 'Personnalisé', start, end, fmt);
      toast.success(`${fmt === 'excel' ? 'Excel' : 'PDF'} généré avec succès`, { description: title });
    } catch (e) {
      toast.error('Erreur lors de la génération du rapport');
    } finally {
      setGenerating(null);
    }
  }, [addHistory, reportData, orgName]);

  const toggleBranch = (id: string) => {
    setSelectedBranches((prev) => prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]);
  };

  const toggleSentiment = (s: string) => {
    setSelectedSentiments((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Rapports</h1>
        <p className="text-sm text-muted-foreground mt-1">Générez et exportez vos rapports qualité</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="predefined" className="gap-1.5">
            <FileBarChart className="h-3.5 w-3.5" /> Rapports prédéfinis
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Rapport personnalisé
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Historique
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" /> Planification
          </TabsTrigger>
        </TabsList>

        {/* ─── Predefined Reports ─── */}
        <TabsContent value="predefined" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Daily */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-display">Rapport Journalier</CardTitle>
                    <CardDescription className="text-xs">Résumé de la journée</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <DatePicker date={dailyDate} onSelect={setDailyDate} label="Date" />
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm" className="flex-1 gap-1 text-xs"
                    disabled={!!generating}
                    onClick={() => {
                      const d = dailyDate;
                      generate('daily-xl', `Rapport Journalier — ${format(d, 'dd MMM yyyy', { locale: fr })}`, 'daily', startOfDay(d), endOfDay(d), 'excel');
                    }}
                  >
                    {generating === 'daily-xl' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet className="h-3 w-3" />} Excel
                  </Button>
                  <Button
                    size="sm" className="flex-1 gap-1 text-xs"
                    disabled={!!generating}
                    onClick={() => {
                      const d = dailyDate;
                      generate('daily-pdf', `Rapport Journalier — ${format(d, 'dd MMM yyyy', { locale: fr })}`, 'daily', startOfDay(d), endOfDay(d), 'pdf');
                    }}
                  >
                    {generating === 'daily-pdf' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />} PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Weekly */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <CalendarIcon className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-display">Rapport Hebdomadaire</CardTitle>
                    <CardDescription className="text-xs">Comparaison semaine précédente</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <DatePicker date={weeklyDate} onSelect={setWeeklyDate} label="Semaine du" />
                <p className="text-[10px] text-muted-foreground">
                  {format(startOfWeek(weeklyDate, { weekStartsOn: 1 }), 'dd/MM')} — {format(endOfWeek(weeklyDate, { weekStartsOn: 1 }), 'dd/MM/yyyy')}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm" className="flex-1 gap-1 text-xs"
                    disabled={!!generating}
                    onClick={() => {
                      const s = startOfWeek(weeklyDate, { weekStartsOn: 1 });
                      const e = endOfWeek(weeklyDate, { weekStartsOn: 1 });
                      generate('weekly-xl', `Rapport Hebdomadaire — S${format(s, 'ww', { locale: fr })} ${format(s, 'yyyy')}`, 'weekly', s, e, 'excel');
                    }}
                  >
                    {generating === 'weekly-xl' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet className="h-3 w-3" />} Excel
                  </Button>
                  <Button
                    size="sm" className="flex-1 gap-1 text-xs"
                    disabled={!!generating}
                    onClick={() => {
                      const s = startOfWeek(weeklyDate, { weekStartsOn: 1 });
                      const e = endOfWeek(weeklyDate, { weekStartsOn: 1 });
                      generate('weekly-pdf', `Rapport Hebdomadaire — S${format(s, 'ww', { locale: fr })} ${format(s, 'yyyy')}`, 'weekly', s, e, 'pdf');
                    }}
                  >
                    {generating === 'weekly-pdf' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />} PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Monthly */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <CalendarIcon className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-display">Rapport Mensuel</CardTitle>
                    <CardDescription className="text-xs">Analyse détaillée du mois</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <DatePicker date={monthlyDate} onSelect={setMonthlyDate} label="Mois" />
                <p className="text-[10px] text-muted-foreground">
                  {format(startOfMonth(monthlyDate), 'dd/MM')} — {format(endOfMonth(monthlyDate), 'dd/MM/yyyy')}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm" className="flex-1 gap-1 text-xs"
                    disabled={!!generating}
                    onClick={() => {
                      const s = startOfMonth(monthlyDate);
                      const e = endOfMonth(monthlyDate);
                      generate('monthly-xl', `Rapport Mensuel — ${format(monthlyDate, 'MMMM yyyy', { locale: fr })}`, 'monthly', s, e, 'excel');
                    }}
                  >
                    {generating === 'monthly-xl' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet className="h-3 w-3" />} Excel
                  </Button>
                  <Button
                    size="sm" className="flex-1 gap-1 text-xs"
                    disabled={!!generating}
                    onClick={() => {
                      const s = startOfMonth(monthlyDate);
                      const e = endOfMonth(monthlyDate);
                      generate('monthly-pdf', `Rapport Mensuel — ${format(monthlyDate, 'MMMM yyyy', { locale: fr })}`, 'monthly', s, e, 'pdf');
                    }}
                  >
                    {generating === 'monthly-pdf' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />} PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Custom Report ─── */}
        <TabsContent value="custom" className="mt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base font-display">Rapport personnalisé</CardTitle>
              <CardDescription className="text-xs">Configurez les paramètres de votre rapport sur mesure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Period */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" /> Période
                </Label>
                <div className="flex items-center gap-2 flex-wrap">
                  <DatePicker date={customStart} onSelect={setCustomStart} label="Début" />
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <DatePicker date={customEnd} onSelect={setCustomEnd} label="Fin" />
                </div>
              </div>

              <Separator />

              {/* Branches */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Agences
                </Label>
                <p className="text-[10px] text-muted-foreground">Laissez vide pour inclure toutes les agences</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {branches.map((b) => (
                    <label key={b.id} className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-xs',
                      selectedBranches.includes(b.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    )}>
                      <Checkbox
                        checked={selectedBranches.includes(b.id)}
                        onCheckedChange={() => toggleBranch(b.id)}
                      />
                      {b.name}
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Sentiments */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Sentiments à inclure</Label>
                <div className="flex gap-3">
                  {[
                    { key: 'very_happy', label: '😄 Très satisfait', color: 'text-accent' },
                    { key: 'happy', label: '😊 Satisfait', color: 'text-primary' },
                    { key: 'unhappy', label: '😕 Insatisfait', color: 'text-orange-500' },
                    { key: 'very_unhappy', label: '😞 Très insatisfait', color: 'text-destructive' },
                  ].map((s) => (
                    <label key={s.key} className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-xs',
                      selectedSentiments.includes(s.key) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    )}>
                      <Checkbox
                        checked={selectedSentiments.includes(s.key)}
                        onCheckedChange={() => toggleSentiment(s.key)}
                      />
                      <span className={s.color}>{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Data to include */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5" /> Données à inclure
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { checked: includeGlobalMetrics, onChange: setIncludeGlobalMetrics, label: 'Métriques globales' },
                    { checked: includeBranchDetail, onChange: setIncludeBranchDetail, label: 'Détail par agence' },
                    { checked: includeFeedbacks, onChange: setIncludeFeedbacks, label: 'Liste des feedbacks' },
                    { checked: includeAlerts, onChange: setIncludeAlerts, label: 'Alertes de la période' },
                    { checked: includeCharts, onChange: setIncludeCharts, label: 'Graphiques (PDF)' },
                  ].map((item) => (
                    <label key={item.label} className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={(v) => item.onChange(!!v)}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Generate buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline" className="flex-1 gap-2"
                  disabled={!!generating}
                  onClick={() => {
                    generate('custom-xl', `Rapport Personnalisé — ${format(customStart, 'dd MMM', { locale: fr })} au ${format(customEnd, 'dd MMM yyyy', { locale: fr })}`, 'custom', customStart, customEnd, 'excel', {
                      includeBranches: includeBranchDetail,
                      includeFeedbacks,
                      includeAlerts,
                      includeCharts,
                      branchIds: selectedBranches.length ? selectedBranches : undefined,
                      sentiments: selectedSentiments,
                    });
                  }}
                >
                  {generating === 'custom-xl' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                  Générer Excel
                </Button>
                <Button
                  className="flex-1 gap-2"
                  disabled={!!generating}
                  onClick={() => {
                    generate('custom-pdf', `Rapport Personnalisé — ${format(customStart, 'dd MMM', { locale: fr })} au ${format(customEnd, 'dd MMM yyyy', { locale: fr })}`, 'custom', customStart, customEnd, 'pdf', {
                      includeBranches: includeBranchDetail,
                      includeFeedbacks,
                      includeAlerts,
                      includeCharts,
                      branchIds: selectedBranches.length ? selectedBranches : undefined,
                      sentiments: selectedSentiments,
                    });
                  }}
                >
                  {generating === 'custom-pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Générer PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── History ─── */}
        <TabsContent value="history" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-display font-semibold">Rapports récents</h2>
            <Badge variant="secondary" className="text-[10px]">{history.length} rapport{history.length > 1 ? 's' : ''}</Badge>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : history.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-8 text-center text-muted-foreground text-sm">
                Aucun rapport généré pour le moment.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => (
                <Card key={entry.id} className="glass-card hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={cn(
                      'p-2.5 rounded-lg',
                      entry.format === 'excel' ? 'bg-accent/10' : 'bg-destructive/10'
                    )}>
                      {entry.format === 'excel'
                        ? <FileSpreadsheet className="h-5 w-5 text-accent" />
                        : <FileText className="h-5 w-5 text-destructive" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{entry.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.type} · {entry.period} · {format(new Date(entry.generatedAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {entry.format}
                      </Badge>
                      <Button variant="outline" size="sm" className="gap-1 text-xs">
                        <Download className="h-3 w-3" /> Re-télécharger
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Schedule ─── */}
        <TabsContent value="schedule" className="mt-4">
          <ScheduleManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── DatePicker sub-component ─── */
function DatePicker({ date, onSelect, label }: { date: Date; onSelect: (d: Date) => void; label: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-1.5 text-xs justify-start font-normal', !date && 'text-muted-foreground')}>
          <CalendarIcon className="h-3 w-3" />
          {date ? format(date, 'dd MMM yyyy', { locale: fr }) : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && onSelect(d)}
          initialFocus
          className="p-3 pointer-events-auto"
          locale={fr}
        />
      </PopoverContent>
    </Popover>
  );
}
