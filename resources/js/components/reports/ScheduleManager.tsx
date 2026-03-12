import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Clock, Plus, Trash2, Mail, Play, Pause, Loader2,
  CalendarIcon, Building2, Settings2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { fetchBranches } from '@/services/dataService';

interface Schedule {
  id: string;
  name: string;
  report_type: string;
  frequency: string;
  custom_interval_days: number | null;
  recipients: string[];
  include_branches: string[];
  include_sentiments: string[];
  include_global_metrics: boolean;
  include_branch_detail: boolean;
  include_feedbacks: boolean;
  include_alerts: boolean;
  include_charts: boolean;
  is_active: boolean;
  last_sent_at: string | null;
  next_run_at: string | null;
  created_at: string;
}

const emptySchedule = {
  name: '',
  report_type: 'daily',
  frequency: 'daily',
  custom_interval_days: 7,
  recipients: [''],
  include_branches: [] as string[],
  include_sentiments: ['positive', 'negative'],
  include_global_metrics: true,
  include_branch_detail: true,
  include_feedbacks: true,
  include_alerts: true,
  include_charts: true,
};

export default function ScheduleManager() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptySchedule);

  const fetchSchedules = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/reports/schedules');
      setSchedules(data.schedules ?? data.data ?? []);
    } catch (e) {}
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSchedules();
    (async () => {
      try {
        const branchList = await fetchBranches();
        setBranches((branchList as any[]).map((b: any) => ({ id: b.id, name: b.name })));
      } catch {}
    })();
  }, [fetchSchedules]);

  const handleSave = async () => {
    if (!user) return;
    if (!form.name.trim()) { toast.error('Veuillez saisir un nom'); return; }
    const validRecipients = form.recipients.filter((r) => r.trim());
    if (validRecipients.length === 0) { toast.error('Ajoutez au moins un destinataire'); return; }

    setSaving(true);
    const now = new Date();
    let nextRun: Date;
    switch (form.frequency) {
      case 'daily': nextRun = new Date(now.getTime() + 86400000); break;
      case 'weekly': nextRun = new Date(now.getTime() + 7 * 86400000); break;
      case 'monthly': nextRun = new Date(now.setMonth(now.getMonth() + 1)); break;
      case 'custom': nextRun = new Date(Date.now() + (form.custom_interval_days || 7) * 86400000); break;
      default: nextRun = new Date(Date.now() + 86400000);
    }

    try {
      await api.post('/reports/schedules', {
        name: form.name,
        report_type: form.report_type,
        frequency: form.frequency,
        custom_interval_days: form.frequency === 'custom' ? form.custom_interval_days : null,
        recipients: validRecipients,
        include_branches: form.include_branches,
        include_sentiments: form.include_sentiments,
        include_global_metrics: form.include_global_metrics,
        include_branch_detail: form.include_branch_detail,
        include_feedbacks: form.include_feedbacks,
        include_alerts: form.include_alerts,
        include_charts: form.include_charts,
      });
    } catch (e) {
      setSaving(false);
      toast.error('Erreur lors de la sauvegarde');
      return;
    }

    setSaving(false);
    toast.success('Planification créée avec succès');
    setShowDialog(false);
    setForm(emptySchedule);
    fetchSchedules();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await api.put(`/reports/schedules/${id}`, { is_active: !current });
    setSchedules((prev) => prev.map((s) => s.id === id ? { ...s, is_active: !current } : s));
    toast.success(!current ? 'Planification activée' : 'Planification mise en pause');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await api.delete(`/reports/schedules/${deleteId}`);
    setSchedules((prev) => prev.filter((s) => s.id !== deleteId));
    setDeleteId(null);
    toast.success('Planification supprimée');
  };

  const addRecipient = () => setForm((f) => ({ ...f, recipients: [...f.recipients, ''] }));
  const updateRecipient = (idx: number, val: string) =>
    setForm((f) => ({ ...f, recipients: f.recipients.map((r, i) => i === idx ? val : r) }));
  const removeRecipient = (idx: number) =>
    setForm((f) => ({ ...f, recipients: f.recipients.filter((_, i) => i !== idx) }));

  const toggleBranch = (id: string) =>
    setForm((f) => ({
      ...f,
      include_branches: f.include_branches.includes(id)
        ? f.include_branches.filter((b) => b !== id)
        : [...f.include_branches, id],
    }));

  const frequencyLabel = (f: string, days?: number | null) => {
    switch (f) {
      case 'daily': return 'Quotidien';
      case 'weekly': return 'Hebdomadaire';
      case 'monthly': return 'Mensuel';
      case 'custom': return `Tous les ${days || 7} jours`;
      default: return f;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-display font-semibold">Planifications actives</h2>
          <p className="text-xs text-muted-foreground">Rapports envoyés automatiquement par email</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setForm(emptySchedule); setShowDialog(true); }}>
          <Plus className="h-3.5 w-3.5" /> Nouvelle planification
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Card className="glass-card border-dashed">
          <CardContent className="p-8 text-center space-y-3">
            <Clock className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Aucune planification configurée</p>
            <Button size="sm" variant="outline" onClick={() => { setForm(emptySchedule); setShowDialog(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Créer une planification
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {schedules.map((s) => (
            <Card key={s.id} className="glass-card hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn(
                  'p-2.5 rounded-lg',
                  s.is_active ? 'bg-primary/10' : 'bg-muted'
                )}>
                  <Clock className={cn('h-5 w-5', s.is_active ? 'text-primary' : 'text-muted-foreground')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{s.name}</p>
                    <Badge variant={s.is_active ? 'default' : 'secondary'} className="text-[10px]">
                      {s.is_active ? 'Actif' : 'En pause'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {frequencyLabel(s.frequency, s.custom_interval_days)} ·{' '}
                    {s.recipients.length} destinataire{s.recipients.length > 1 ? 's' : ''} ·{' '}
                    {s.next_run_at
                      ? `Prochain envoi : ${format(new Date(s.next_run_at), 'dd/MM/yyyy HH:mm', { locale: fr })}`
                      : 'Non planifié'}
                  </p>
                  {s.last_sent_at && (
                    <p className="text-[10px] text-muted-foreground">
                      Dernier envoi : {format(new Date(s.last_sent_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={s.is_active}
                    onCheckedChange={() => toggleActive(s.id, s.is_active)}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Nouvelle planification</DialogTitle>
            <DialogDescription>Configurez l'envoi automatique de rapports par email</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nom de la planification</Label>
              <Input
                placeholder="ex: Rapport hebdomadaire direction"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Report type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Type de rapport</Label>
              <Select value={form.report_type} onValueChange={(v) => setForm((f) => ({ ...f, report_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Journalier</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Frequency */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fréquence d'envoi</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm((f) => ({ ...f, frequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Quotidien</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
              {form.frequency === 'custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <Label className="text-xs whitespace-nowrap">Tous les</Label>
                  <Input
                    type="number" min={1} max={365}
                    className="w-20"
                    value={form.custom_interval_days || ''}
                    onChange={(e) => setForm((f) => ({ ...f, custom_interval_days: parseInt(e.target.value) || 7 }))}
                  />
                  <Label className="text-xs">jours</Label>
                </div>
              )}
            </div>

            <Separator />

            {/* Recipients */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Destinataires
              </Label>
              {form.recipients.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={r}
                    onChange={(e) => updateRecipient(i, e.target.value)}
                  />
                  {form.recipients.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeRecipient(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={addRecipient}>
                <Plus className="h-3 w-3" /> Ajouter un destinataire
              </Button>
            </div>

            <Separator />

            {/* Branches */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Agences
              </Label>
              <p className="text-[10px] text-muted-foreground">Laissez vide pour toutes les agences</p>
              <div className="grid grid-cols-2 gap-1.5">
                {branches.map((b) => (
                  <label key={b.id} className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-pointer transition-colors text-xs',
                    form.include_branches.includes(b.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  )}>
                    <Checkbox
                      checked={form.include_branches.includes(b.id)}
                      onCheckedChange={() => toggleBranch(b.id)}
                    />
                    {b.name}
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            {/* Data options */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Settings2 className="h-3.5 w-3.5" /> Données à inclure
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: 'include_global_metrics', label: 'Métriques globales' },
                  { key: 'include_branch_detail', label: 'Détail par agence' },
                  { key: 'include_feedbacks', label: 'Feedbacks' },
                  { key: 'include_alerts', label: 'Alertes' },
                  { key: 'include_charts', label: 'Graphiques' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={(form as any)[item.key]}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, [item.key]: !!v }))}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Créer la planification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette planification ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les prochains envois seront annulés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
