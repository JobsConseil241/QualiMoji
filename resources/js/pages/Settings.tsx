import { useState, useEffect, useCallback } from 'react';
import { Save, Bell, Gauge, Building2, Plus, X, Clock, Zap, MessageSquare, Users, MapPin, Monitor } from 'lucide-react';
import WhatsAppTemplates from '@/components/settings/WhatsAppTemplates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { fetchBranches } from '@/services/dataService';
import { QuestionsConfig, DEFAULT_CONFIGS, type QuestionConfig } from '@/components/settings/QuestionsConfig';
import UserManagement from '@/components/settings/UserManagement';
import OrganizationConfig from '@/components/settings/OrganizationConfig';
import BranchManagement from '@/components/settings/BranchManagement';
import { useAuth } from '@/hooks/useAuth';
import KioskSettings from '@/components/settings/KioskSettings';

/* ---------- types ---------- */
interface AlertThreshold {
  key: string;
  label: string;
  description: string;
  threshold: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  period: string;
  severity: string;
  enabled: boolean;
  isSlider: boolean;
}

interface NotifChannel {
  channel: string;
  label: string;
  icon: string;
  enabled: boolean;
  recipients: string[];
}

interface NotifPrefs {
  scheduleStart: number;
  scheduleEnd: number;
  maxFrequency: number;
}

/* ---------- defaults ---------- */
const DEFAULT_THRESHOLDS: AlertThreshold[] = [
  { key: 'dissatisfaction_rate', label: 'Alertes Insatisfaction', description: 'Alerte quand le taux d\'insatisfaits dépasse le seuil', threshold: 10, min: 1, max: 50, step: 1, unit: '%', period: 'week', severity: 'warning', enabled: true, isSlider: true },
  { key: 'low_satisfaction', label: 'Satisfaction Basse', description: 'Alerte quand la satisfaction tombe en dessous du seuil', threshold: 70, min: 30, max: 100, step: 1, unit: '%', period: 'month', severity: 'critical', enabled: true, isSlider: true },
  { key: 'consecutive_negative', label: 'Feedbacks Négatifs Consécutifs', description: 'Alerte après N feedbacks négatifs consécutifs', threshold: 3, min: 1, max: 20, step: 1, unit: '', period: 'day', severity: 'warning', enabled: true, isSlider: false },
];

const DEFAULT_CHANNELS: NotifChannel[] = [
  { channel: 'whatsapp', label: 'WhatsApp', icon: '📱', enabled: false, recipients: [] },
  { channel: 'email', label: 'Email', icon: '✉️', enabled: true, recipients: [] },
  { channel: 'dashboard', label: 'Dashboard uniquement', icon: '🖥️', enabled: true, recipients: [] },
];

/* ---------- component ---------- */
export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'it_admin';
  const [thresholds, setThresholds] = useState<AlertThreshold[]>(DEFAULT_THRESHOLDS);
  const [channels, setChannels] = useState<NotifChannel[]>(DEFAULT_CHANNELS);
  const [prefs, setPrefs] = useState<NotifPrefs>({ scheduleStart: 8, scheduleEnd: 20, maxFrequency: 60 });
  const [scopeMode, setScopeMode] = useState<'global' | 'per_branch'>('global');
  const [branchOverrides, setBranchOverrides] = useState<Record<string, Partial<AlertThreshold>[]>>({});
  const [saving, setSaving] = useState(false);
  const [newRecipient, setNewRecipient] = useState<Record<string, string>>({});
  const [questionConfigs, setQuestionConfigs] = useState<QuestionConfig[]>(DEFAULT_CONFIGS);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  /* load from DB */
  useEffect(() => {
    (async () => {
      try {
        // Load branches
        const branchList = await fetchBranches();
        setBranches((branchList as any[]).map((b: any) => ({ id: b.id, name: b.name })));

        // Load KPI configs
        const { data: kpiData } = await api.get('/settings/kpi');
        const kpiRows = kpiData?.kpi_configs ?? kpiData?.data ?? (Array.isArray(kpiData) ? kpiData : []);
        if (kpiRows.length > 0) {
          const globalRows = kpiRows.filter((r: any) => !r.branch_id);
          if (globalRows.length > 0) {
            setThresholds((prev) =>
              prev.map((t) => {
                const row = globalRows.find((r: any) => r.config_key === t.key);
                if (row) {
                  const v = row.config_value as any;
                  return { ...t, threshold: v.threshold ?? t.threshold, period: v.period ?? t.period, severity: v.severity ?? t.severity, enabled: v.enabled ?? t.enabled };
                }
                return t;
              })
            );
          }
          const branchRows = kpiRows.filter((r: any) => r.branch_id);
          if (branchRows.length > 0) {
            setScopeMode('per_branch');
            const overrides: Record<string, Partial<AlertThreshold>[]> = {};
            branchRows.forEach((r: any) => {
              if (!overrides[r.branch_id]) overrides[r.branch_id] = [];
              overrides[r.branch_id].push({ key: r.config_key, ...(r.config_value as any) });
            });
            setBranchOverrides(overrides);
          }
        }

        // Load notification configs
        const { data: notifData } = await api.get('/settings/notifications');
        const notifRows = notifData?.notification_configs ?? notifData?.data ?? (Array.isArray(notifData) ? notifData : []);
        if (notifRows.length > 0) {
          setChannels((prev) =>
            prev.map((ch) => {
              const row = notifRows.find((r: any) => r.channel === ch.channel);
              if (row) {
                let recipients = row.recipients ?? [];
                if (typeof recipients === 'string') {
                  try { recipients = JSON.parse(recipients); } catch { recipients = []; }
                }
                return { ...ch, enabled: row.is_enabled, recipients: Array.isArray(recipients) ? recipients : [] };
              }
              return ch;
            })
          );
          const anyRow = notifRows[0] as any;
          if (anyRow) {
            setPrefs({
              scheduleStart: anyRow.schedule_start ?? 8,
              scheduleEnd: anyRow.schedule_end ?? 20,
              maxFrequency: anyRow.max_frequency_minutes ?? 60,
            });
          }
        }

        // Load question configs
        const { data: qData } = await api.get('/settings/questions');
        const qRows = qData?.question_configs ?? qData?.data ?? (Array.isArray(qData) ? qData : []);
        if (qRows.length > 0) {
          const loaded: QuestionConfig[] = qRows.map((row: any) => ({
            sentiment: row.sentiment,
            emoji: row.emoji || '🙂',
            label: row.label || row.sentiment,
            question: row.question || '',
            options: Array.isArray(row.options) ? (row.options as any[]).map((o: any, i: number) => ({ id: o.id || crypto.randomUUID(), label: o.label || '', order: o.order ?? i })) : [],
            allowFreeText: row.allow_free_text ?? true,
            isActive: row.is_active ?? true,
          }));
          const defaultsNotInDb = DEFAULT_CONFIGS.filter((d) => !loaded.some((l) => l.sentiment === d.sentiment));
          setQuestionConfigs([...loaded, ...defaultsNotInDb]);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    })();
  }, []);

  /* save */
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Save KPI thresholds
      await api.post('/settings/kpi', {
        thresholds: thresholds.map(t => ({
          config_key: t.key,
          branch_id: null,
          config_value: { threshold: t.threshold, period: t.period, severity: t.severity, enabled: t.enabled },
        })),
        branch_overrides: scopeMode === 'per_branch' ? branchOverrides : {},
      });

      // Save notification config
      await api.post('/settings/notifications', {
        channels: channels.map(ch => ({
          channel: ch.channel,
          is_enabled: ch.enabled,
          recipients: ch.recipients,
          schedule_start: prefs.scheduleStart,
          schedule_end: prefs.scheduleEnd,
          max_frequency_minutes: prefs.maxFrequency,
        })),
      });

      // Save question configs
      await api.post('/settings/questions', {
        configs: questionConfigs.map((qc, index) => ({
          sentiment: qc.sentiment,
          question: qc.question,
          options: qc.options,
          allow_free_text: qc.allowFreeText,
          is_active: qc.isActive,
          emoji: qc.emoji,
          label: qc.label,
          sort_order: index,
        })),
      });

      toast({ title: 'Paramètres enregistrés', description: 'Vos configurations ont été sauvegardées avec succès.' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.response?.data?.message || err.message || 'Une erreur est survenue', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [thresholds, channels, prefs, scopeMode, branchOverrides, questionConfigs, toast]);

  /* helpers */
  const updateThreshold = (key: string, updates: Partial<AlertThreshold>) => {
    setThresholds((prev) => prev.map((t) => (t.key === key ? { ...t, ...updates } : t)));
  };

  const addRecipient = (channel: string) => {
    const val = (newRecipient[channel] || '').trim();
    if (!val) return;
    setChannels((prev) =>
      prev.map((ch) => (ch.channel === channel ? { ...ch, recipients: [...ch.recipients, val] } : ch))
    );
    setNewRecipient((prev) => ({ ...prev, [channel]: '' }));
  };

  const removeRecipient = (channel: string, idx: number) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.channel === channel ? { ...ch, recipients: ch.recipients.filter((_, i) => i !== idx) } : ch))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Paramètres</h1>
          <p className="text-sm text-muted-foreground mt-1">Configuration des seuils d'alerte et notifications</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList className="flex-wrap">
          {isAdmin && (
            <TabsTrigger value="organization" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Organisation</TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="branches" className="gap-1.5"><MapPin className="h-3.5 w-3.5" /> Agences</TabsTrigger>
          )}
          <TabsTrigger value="kpi" className="gap-1.5"><Gauge className="h-3.5 w-3.5" /> Seuils KPI</TabsTrigger>
          <TabsTrigger value="questions" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Questions</TabsTrigger>
          <TabsTrigger value="kiosk" className="gap-1.5"><Monitor className="h-3.5 w-3.5" /> Kiosk</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Utilisateurs</TabsTrigger>
          )}
        </TabsList>

        {/* ==================== ORGANISATION TAB ==================== */}
        {isAdmin && (
          <TabsContent value="organization" className="space-y-6">
            <OrganizationConfig />
          </TabsContent>
        )}

        {/* ==================== AGENCES TAB ==================== */}
        {isAdmin && (
          <TabsContent value="branches" className="space-y-6">
            <BranchManagement />
          </TabsContent>
        )}

        {/* ==================== KPI TAB ==================== */}
        <TabsContent value="kpi" className="space-y-6">
          {thresholds.map((t) => (
            <Card key={t.key} className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-display">{t.label}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{t.description}</CardDescription>
                  </div>
                  <Switch checked={t.enabled} onCheckedChange={(v) => updateThreshold(t.key, { enabled: v })} />
                </div>
              </CardHeader>
              <CardContent className={cn('space-y-5', !t.enabled && 'opacity-50 pointer-events-none')}>
                {/* Threshold value */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Seuil</Label>
                    <span className="text-lg font-display font-bold">
                      {t.threshold}{t.unit}
                    </span>
                  </div>
                  {t.isSlider ? (
                    <Slider
                      value={[t.threshold]}
                      onValueChange={([v]) => updateThreshold(t.key, { threshold: v })}
                      min={t.min}
                      max={t.max}
                      step={t.step}
                      className="py-1"
                    />
                  ) : (
                    <Input
                      type="number"
                      value={t.threshold}
                      onChange={(e) => updateThreshold(t.key, { threshold: Number(e.target.value) })}
                      min={t.min}
                      max={t.max}
                      className="w-24"
                    />
                  )}
                  {t.isSlider && (
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{t.min}{t.unit}</span>
                      <span>{t.max}{t.unit}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Period */}
                  {t.isSlider && (
                    <div className="space-y-2">
                      <Label className="text-xs">Période de calcul</Label>
                      <Select value={t.period} onValueChange={(v) => updateThreshold(t.key, { period: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Jour</SelectItem>
                          <SelectItem value="week">Semaine</SelectItem>
                          <SelectItem value="month">Mois</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {/* Severity */}
                  <div className="space-y-2">
                    <Label className="text-xs">Sévérité</Label>
                    <Select value={t.severity} onValueChange={(v) => updateThreshold(t.key, { severity: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warning">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-warning" /> Warning
                          </div>
                        </SelectItem>
                        <SelectItem value="critical">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-destructive" /> Critical
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Scope: global vs per branch */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Portée des paramètres
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">Appliquer les seuils globalement ou par agence</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs', scopeMode === 'global' ? 'font-semibold' : 'text-muted-foreground')}>Global</span>
                  <Switch checked={scopeMode === 'per_branch'} onCheckedChange={(v) => setScopeMode(v ? 'per_branch' : 'global')} />
                  <span className={cn('text-xs', scopeMode === 'per_branch' ? 'font-semibold' : 'text-muted-foreground')}>Par agence</span>
                </div>
              </div>
            </CardHeader>
            {scopeMode === 'per_branch' && (
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Agence</TableHead>
                        {thresholds.map((t) => (
                          <TableHead key={t.key} className="text-xs text-center">{t.label.split(' ').slice(0, 2).join(' ')}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branches.map((branch) => (
                        <TableRow key={branch.id}>
                          <TableCell className="text-xs font-medium">{branch.name.replace('Agence ', '')}</TableCell>
                          {thresholds.map((t) => {
                            const ov = branchOverrides[branch.id]?.find((o) => o.key === t.key);
                            const val = ov?.threshold ?? t.threshold;
                            return (
                              <TableCell key={t.key} className="text-center">
                                <Input
                                  type="number"
                                  value={val}
                                  onChange={(e) => {
                                    const num = Number(e.target.value);
                                    setBranchOverrides((prev) => {
                                      const existing = prev[branch.id] || [];
                                      const idx = existing.findIndex((o) => o.key === t.key);
                                      const newOv = { key: t.key, threshold: num, period: t.period, severity: t.severity, enabled: t.enabled };
                                      if (idx >= 0) {
                                        const updated = [...existing];
                                        updated[idx] = { ...updated[idx], threshold: num };
                                        return { ...prev, [branch.id]: updated };
                                      }
                                      return { ...prev, [branch.id]: [...existing, newOv] };
                                    });
                                  }}
                                  className="h-7 w-16 text-xs text-center mx-auto"
                                  min={t.min}
                                  max={t.max}
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* ==================== QUESTIONS TAB ==================== */}
        <TabsContent value="questions" className="space-y-6">
          <QuestionsConfig configs={questionConfigs} onChange={setQuestionConfigs} />
        </TabsContent>

        {/* ==================== KIOSK TAB ==================== */}
        <TabsContent value="kiosk" className="space-y-6">
          <KioskSettings />
        </TabsContent>

        {/* ==================== USERS TAB (Admin only) ==================== */}
        {isAdmin && (
          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>
        )}

        {/* ==================== NOTIFICATIONS TAB ==================== */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display">Canaux de notification</CardTitle>
              <CardDescription className="text-xs">Choisissez comment recevoir les alertes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {channels.map((ch) => (
                <div key={ch.channel}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{ch.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{ch.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {ch.channel === 'dashboard' ? 'Notifications dans l\'application' : `Envoyer les alertes par ${ch.label}`}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={ch.enabled}
                      onCheckedChange={(v) => setChannels((prev) => prev.map((c) => (c.channel === ch.channel ? { ...c, enabled: v } : c)))}
                    />
                  </div>

                  {ch.enabled && ch.channel !== 'dashboard' && (
                    <div className="mt-3 ml-8 space-y-2">
                      <Label className="text-xs">Destinataires</Label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {ch.recipients.map((r, i) => (
                          <Badge key={i} variant="secondary" className="text-xs gap-1 pr-1">
                            {r}
                            <button onClick={() => removeRecipient(ch.channel, i)} className="hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newRecipient[ch.channel] || ''}
                          onChange={(e) => setNewRecipient((prev) => ({ ...prev, [ch.channel]: e.target.value }))}
                          placeholder={ch.channel === 'whatsapp' ? '+33 6 12 34 56 78' : 'email@exemple.com'}
                          className="h-8 text-xs flex-1"
                          onKeyDown={(e) => e.key === 'Enter' && addRecipient(ch.channel)}
                        />
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => addRecipient(ch.channel)}>
                          <Plus className="h-3 w-3" /> Ajouter
                        </Button>
                      </div>
                    </div>
                  )}
                  <Separator className="mt-4" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Clock className="h-4 w-4" /> Préférences
              </CardTitle>
              <CardDescription className="text-xs">Contrôlez quand et à quelle fréquence recevoir les alertes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <Label className="text-sm">Horaires de notification</Label>
                <div className="flex items-center gap-3">
                  <Select value={String(prefs.scheduleStart)} onValueChange={(v) => setPrefs((p) => ({ ...p, scheduleStart: Number(v) }))}>
                    <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>{String(i).padStart(2, '0')}h</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">à</span>
                  <Select value={String(prefs.scheduleEnd)} onValueChange={(v) => setPrefs((p) => ({ ...p, scheduleEnd: Number(v) }))}>
                    <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>{String(i).padStart(2, '0')}h</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[10px] text-muted-foreground">Les alertes en dehors de ces horaires seront mises en file d'attente</p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Fréquence maximale</Label>
                  <span className="text-sm font-display font-bold">{prefs.maxFrequency} min</span>
                </div>
                <Slider
                  value={[prefs.maxFrequency]}
                  onValueChange={([v]) => setPrefs((p) => ({ ...p, maxFrequency: v }))}
                  min={5}
                  max={240}
                  step={5}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>5 min</span>
                  <span>4 heures</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Maximum 1 alerte par agence toutes les {prefs.maxFrequency} minutes</p>
              </div>
            </CardContent>
          </Card>

          <WhatsAppTemplates />
        </TabsContent>
      </Tabs>

      {/* Bottom save button (mobile) */}
      <div className="flex justify-end pb-4">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}
        </Button>
      </div>
    </div>
  );
}
