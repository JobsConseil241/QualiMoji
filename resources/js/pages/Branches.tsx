import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUp, ArrowDown, Minus, Search, Download, Trophy, Medal, Award,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, FileSpreadsheet, Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { fetchBranches } from '@/services/dataService';

interface BranchRow {
  id: string;
  name: string;
  city: string;
  region: string;
  satisfactionScore: number;
  totalFeedbacks: number;
  activeAlerts: number;
  trend: 'up' | 'down' | 'stable';
  trendValue?: number;
  rank: number;
}

type SortKey = 'rank' | 'name' | 'city' | 'satisfactionScore' | 'totalFeedbacks' | 'activeAlerts' | 'trend';
type SortDir = 'asc' | 'desc';

const TrendIcon = { up: ArrowUp, down: ArrowDown, stable: Minus };
const trendColor = { up: 'text-success', down: 'text-destructive', stable: 'text-muted-foreground' };
const trendLabel = { up: 'Hausse', down: 'Baisse', stable: 'Stable' };
const PAGE_SIZES = [5, 10, 20];

const medals = [
  { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { icon: Medal, color: 'text-slate-400', bg: 'bg-slate-400/10' },
  { icon: Award, color: 'text-amber-700', bg: 'bg-amber-700/10' },
];

function getSatisfactionColor(pct: number) {
  if (pct >= 80) return 'text-success';
  if (pct >= 60) return 'text-warning';
  return 'text-destructive';
}

function determineTrend(score: number): { trend: 'up' | 'down' | 'stable'; trendValue?: number } {
  // Without historical data, default to stable
  return { trend: 'stable' };
}

export default function Branches() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('satisfactionScore');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [branchRows, setBranchRows] = useState<BranchRow[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const branches = await fetchBranches();

        const rows: Omit<BranchRow, 'rank'>[] = branches.map((b: any) => {
          const stats = b.stats ?? {};
          const satisfactionRate = stats.satisfaction_rate ?? 0;
          const { trend, trendValue } = determineTrend(satisfactionRate);
          return {
            id: b.id,
            name: b.name,
            city: b.city || '',
            region: b.region || '',
            satisfactionScore: satisfactionRate,
            totalFeedbacks: stats.total_feedbacks ?? b.feedbacks_count ?? 0,
            activeAlerts: stats.active_alerts ?? 0,
            trend,
            trendValue,
          };
        });

        // Rank by satisfaction score desc
        const sorted = [...rows].sort((a, b) => b.satisfactionScore - a.satisfactionScore);
        const ranked = sorted.map((r, i) => ({ ...r, rank: i + 1 }));
        setBranchRows(ranked);
      } catch (err) {
        console.error('Failed to load branches:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return branchRows.filter(
      (b) => b.name.toLowerCase().includes(q) || b.city.toLowerCase().includes(q) || b.region.toLowerCase().includes(q)
    );
  }, [branchRows, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name' || sortKey === 'city') cmp = a[sortKey].localeCompare(b[sortKey]);
      else if (sortKey === 'trend') cmp = a.trend.localeCompare(b.trend);
      else cmp = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const exportCSV = () => {
    const headers = ['Rang,Agence,Ville,Province,Satisfaction,Feedbacks,Alertes,Tendance'];
    const rows = branchRows.map((b) =>
      `${b.rank},"${b.name}","${b.city}","${b.region}",${b.satisfactionScore},${b.totalFeedbacks},${b.activeAlerts},${b.trend}`
    );
    const csv = [...headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'agences.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['nom', 'ville', 'province', 'adresse'],
      ['Agence Exemple', 'Casablanca', 'Grand Casablanca', '12 Rue Exemple'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Agences');
    XLSX.writeFile(wb, 'modele_agences.xlsx');
  };

  const SortableHead = ({ label, col }: { label: string; col: SortKey }) => (
    <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => toggleSort(col)}>
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn('h-3 w-3', sortKey === col ? 'text-foreground' : 'text-muted-foreground/40')} />
      </div>
    </TableHead>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Agences</h1>
        <p className="text-sm text-muted-foreground mt-1">Classement et performance de toutes les agences</p>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base font-display">Liste des agences</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="pl-8 h-8 text-sm w-full sm:w-56"
                />
              </div>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={downloadTemplate}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> Modèle
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={exportCSV}>
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Rang" col="rank" />
                  <SortableHead label="Agence" col="name" />
                  <SortableHead label="Ville" col="city" />
                  <SortableHead label="Satisfaction" col="satisfactionScore" />
                  <SortableHead label="Feedbacks" col="totalFeedbacks" />
                  <SortableHead label="Alertes" col="activeAlerts" />
                  <SortableHead label="Tendance" col="trend" />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Aucune agence trouvée
                    </TableCell>
                  </TableRow>
                ) : paginated.map((branch) => {
                  const Icon = TrendIcon[branch.trend];
                  const medal = branch.rank <= 3 ? medals[branch.rank - 1] : null;
                  const MedalIcon = medal?.icon;
                  const scorePct = Math.round(branch.satisfactionScore);

                  return (
                    <TableRow
                      key={branch.id}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => navigate(`/branches/${branch.id}`)}
                    >
                      <TableCell>
                        {medal && MedalIcon ? (
                          <div className={cn('inline-flex items-center justify-center w-7 h-7 rounded-lg', medal.bg)}>
                            <MedalIcon className={cn('h-3.5 w-3.5', medal.color)} />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-muted-foreground">
                            <span className="text-xs font-bold">{branch.rank}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{branch.name}</p>
                          <p className="text-xs text-muted-foreground">{branch.region}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{branch.city}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <span className={cn('text-sm font-bold font-display', getSatisfactionColor(scorePct))}>
                            {scorePct}%
                          </span>
                          <Progress value={scorePct} className="h-1.5 flex-1 max-w-[80px]" />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{branch.totalFeedbacks.toLocaleString()}</TableCell>
                      <TableCell>
                        {branch.activeAlerts > 0 ? (
                          <Badge variant="destructive" className="text-[10px]">
                            {branch.activeAlerts}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-success border-success/30">0</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className={cn('flex items-center gap-1.5 text-xs font-medium', trendColor[branch.trend])}>
                          <Icon className="h-3.5 w-3.5" />
                          <span>{trendLabel[branch.trend]}</span>
                          {branch.trendValue !== undefined && (
                            <span className="text-muted-foreground font-normal">
                              ({branch.trendValue > 0 ? '+' : ''}{branch.trendValue}%)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); navigate(`/branches/${branch.id}`); }}>
                          Détail
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{sorted.length} agence{sorted.length > 1 ? 's' : ''}</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
                <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <span>par page</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(0)}>
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                {page + 1} / {totalPages || 1}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
