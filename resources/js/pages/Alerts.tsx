import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertTriangle, AlertCircle, Info, Check, Search, Filter,
  Clock, CheckCircle2, XCircle, MessageSquare, ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  fetchAlerts as fetchAlertsApi,
  markAlertAsRead,
  markAllAlertsAsRead,
  resolveAlert as resolveAlertApi,
  dismissAlert as dismissAlertApi,
} from '@/services/dataService';
import { cn } from '@/lib/utils';

/* ---------- types ---------- */
interface AlertRow {
  id: string;
  branch_id: string;
  branch_name: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  is_read: boolean;
  status: 'active' | 'resolved' | 'dismissed';
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

const alertConfig = {
  critical: { icon: AlertTriangle, label: 'Critique', dotColor: 'bg-destructive', textColor: 'text-destructive', borderColor: 'border-destructive/20 bg-destructive/5' },
  warning: { icon: AlertCircle, label: 'Attention', dotColor: 'bg-warning', textColor: 'text-warning', borderColor: 'border-warning/20 bg-warning/5' },
  info: { icon: Info, label: 'Info', dotColor: 'bg-info', textColor: 'text-info', borderColor: 'border-info/20 bg-info/5' },
};

const statusConfig = {
  active: { label: 'Active', icon: Clock, color: 'text-warning bg-warning/10 border-warning/30' },
  resolved: { label: 'Resolue', icon: CheckCircle2, color: 'text-success bg-success/10 border-success/30' },
  dismissed: { label: 'Rejetee', icon: XCircle, color: 'text-muted-foreground bg-muted border-muted-foreground/30' },
};

export default function Alerts() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [resolveDialog, setResolveDialog] = useState<AlertRow | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);

  /* fetch alerts */
  const loadAlerts = useCallback(async () => {
    try {
      const data = await fetchAlertsApi();
      setAlerts((Array.isArray(data) ? data : []) as AlertRow[]);
    } catch (err: any) {
      console.error('Error fetching alerts:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAlerts();

    // Poll for updates every 30 seconds
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  /* filters */
  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return a.branch_name.toLowerCase().includes(q) || a.message.toLowerCase().includes(q);
      }
      return true;
    });
  }, [alerts, search, typeFilter, statusFilter]);

  /* counts */
  const counts = useMemo(() => ({
    active: alerts.filter((a) => a.status === 'active').length,
    resolved: alerts.filter((a) => a.status === 'resolved').length,
    dismissed: alerts.filter((a) => a.status === 'dismissed').length,
    unread: alerts.filter((a) => !a.is_read).length,
    critical: alerts.filter((a) => a.type === 'critical' && a.status === 'active').length,
  }), [alerts]);

  /* actions */
  const handleMarkAllRead = async () => {
    const unreadIds = alerts.filter((a) => !a.is_read).map((a) => a.id);
    if (unreadIds.length === 0) return;
    try {
      await markAllAlertsAsRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
      toast({ title: 'Fait', description: `${unreadIds.length} alerte(s) marquee(s) comme lue(s)` });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const handleResolveAlert = async (status: 'resolved' | 'dismissed') => {
    if (!resolveDialog) return;
    setResolving(true);
    try {
      if (status === 'resolved') {
        await resolveAlertApi(resolveDialog.id, resolutionNote || undefined);
      } else {
        await dismissAlertApi(resolveDialog.id);
      }
      setAlerts((prev) =>
        prev.map((a) => a.id === resolveDialog.id ? { ...a, status, is_read: true, resolved_at: new Date().toISOString(), resolution_note: resolutionNote || null } : a)
      );
      toast({ title: status === 'resolved' ? 'Alerte resolue' : 'Alerte rejetee', description: resolveDialog.message.slice(0, 60) + '...' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
    setResolving(false);
    setResolveDialog(null);
    setResolutionNote('');
  };

  const toggleRead = async (alert: AlertRow) => {
    try {
      await markAlertAsRead(alert.id);
      setAlerts((prev) => prev.map((a) => a.id === alert.id ? { ...a, is_read: !a.is_read } : a));
    } catch {
      // silent
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Alertes</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestion et suivi des alertes qualite</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={handleMarkAllRead} disabled={counts.unread === 0}>
            <Check className="h-3.5 w-3.5 mr-1" /> Tout marquer lu
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Actives', value: counts.active, color: 'text-warning' },
          { label: 'Critiques', value: counts.critical, color: 'text-destructive' },
          { label: 'Non lues', value: counts.unread, color: 'text-primary' },
          { label: 'Resolues', value: counts.resolved, color: 'text-success' },
        ].map((s) => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-4 text-center">
              <p className={cn('text-2xl font-display font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="critical">Critique</SelectItem>
                <SelectItem value="warning">Attention</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="active">Actives</SelectItem>
                <SelectItem value="resolved">Resolues</SelectItem>
                <SelectItem value="dismissed">Rejetees</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alert list */}
      <div className="space-y-2">
        {loading && <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>}
        {!loading && filtered.length === 0 && (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
              <p className="text-sm font-medium">Aucune alerte</p>
              <p className="text-xs text-muted-foreground mt-1">Aucune alerte ne correspond a vos filtres</p>
            </CardContent>
          </Card>
        )}
        {filtered.map((alert) => {
          const config = alertConfig[alert.type];
          const status = statusConfig[alert.status];
          const Icon = config.icon;
          const StatusIcon = status.icon;

          return (
            <Card key={alert.id} className={cn('glass-card border transition-all', config.borderColor, !alert.is_read && 'ring-1 ring-primary/20')}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn('mt-0.5 p-2 rounded-lg shrink-0', `${config.dotColor}/10`)}>
                    <Icon className={cn('h-4 w-4', config.textColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-sm">{alert.branch_name}</span>
                      <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 h-4 border-current/30', config.textColor)}>
                        {config.label}
                      </Badge>
                      <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 h-4 gap-0.5', status.color)}>
                        <StatusIcon className="h-2.5 w-2.5" /> {status.label}
                      </Badge>
                      {!alert.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-sm text-foreground">{alert.message}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span>
                        {new Date(alert.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {alert.resolved_at && (
                        <span className="text-success">
                          Resolu le {new Date(alert.resolved_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {alert.resolution_note && (
                        <span className="flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" /> Note</span>
                      )}
                    </div>
                    {alert.resolution_note && alert.status !== 'active' && (
                      <div className="mt-2 p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                        <span className="font-medium">Note :</span> {alert.resolution_note}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {alert.status === 'active' && (
                      <>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-success hover:text-success" onClick={() => { setResolveDialog(alert); setResolutionNote(''); }}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Resoudre
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => { setResolveDialog(alert); setResolutionNote(''); }}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleRead(alert)}>
                      {alert.is_read ? <Check className="h-3.5 w-3.5 text-muted-foreground" /> : <span className="h-2 w-2 rounded-full bg-primary" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Resolve Dialog */}
      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent className="sm:max-w-md">
          {resolveDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">Resoudre l'alerte</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">{resolveDialog.branch_name}</p>
                  <p className="text-sm">{resolveDialog.message}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Note de resolution (optionnel)</label>
                  <Textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Decrivez les actions prises..."
                    className="text-sm"
                    rows={3}
                    maxLength={500}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleResolveAlert('dismissed')} disabled={resolving}>
                  <XCircle className="h-3.5 w-3.5" /> Rejeter
                </Button>
                <Button size="sm" className="gap-1 text-xs" onClick={() => handleResolveAlert('resolved')} disabled={resolving}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Marquer resolue
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
