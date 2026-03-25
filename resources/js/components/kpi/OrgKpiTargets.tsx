import { useState, useEffect } from 'react';
import { Loader2, Save, Lock, Unlock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { saveOrgTargets } from '@/services/dataService';
import api from '@/lib/api';

const KPI_DEFINITIONS: Array<{
  key: string;
  label: string;
  description: string;
  unit: string;
  defaultTarget: number;
  defaultCritical: number;
}> = [
  { key: 'satisfaction_rate', label: 'Score de satisfaction', description: 'Pourcentage de clients satisfaits', unit: '%', defaultTarget: 75, defaultCritical: 60 },
  { key: 'nps', label: 'NPS', description: 'Net Promoter Score', unit: 'pts', defaultTarget: 30, defaultCritical: 0 },
  { key: 'dissatisfaction_rate', label: "Taux d'insatisfaction", description: "Seuil maximal d'insatisfaction", unit: '%', defaultTarget: 10, defaultCritical: 25 },
  { key: 'contact_rate', label: 'Taux de contact', description: 'Part des clients laissant un contact', unit: '%', defaultTarget: 25, defaultCritical: 10 },
  { key: 'avg_alert_resolution_hours', label: "Delai traitement alerte", description: 'Temps max pour traiter une alerte', unit: 'h', defaultTarget: 2, defaultCritical: 8 },
  { key: 'alert_resolution_rate', label: "Taux alertes traitees", description: "Proportion d'alertes resolues", unit: '%', defaultTarget: 90, defaultCritical: 60 },
  { key: 'follow_up_rate', label: 'Taux de relance', description: 'Clients insatisfaits recontactes', unit: '%', defaultTarget: 100, defaultCritical: 80 },
  { key: 'insatisfaction_resolution_rate', label: 'Resolution insatisfactions', description: 'Cas resolus', unit: '%', defaultTarget: 70, defaultCritical: 40 },
  { key: 'avg_insatisfaction_resolution_hours', label: 'Delai resolution', description: 'Temps moyen de resolution', unit: 'h', defaultTarget: 48, defaultCritical: 96 },
  { key: 'feedbacks_per_month', label: 'Feedbacks / mois', description: 'Volume minimum par agence', unit: '', defaultTarget: 100, defaultCritical: 30 },
  { key: 'distinct_issues_count', label: "Raisons identifiees", description: "Nombre min de raisons d'insatisfaction", unit: '', defaultTarget: 3, defaultCritical: 0 },
  { key: 'satisfaction_evolution', label: 'Progression satisfaction', description: 'Points de progression attendus', unit: 'pts', defaultTarget: 2, defaultCritical: -5 },
];

interface TargetRow {
  key: string;
  target: number;
  critical: number;
  is_mandatory: boolean;
}

export function OrgKpiTargets() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [targets, setTargets] = useState<TargetRow[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get('/settings/kpi');
        const rows = data?.kpi_configs ?? [];
        const globalRows = rows.filter((r: any) => !r.branch_id);

        const loaded: TargetRow[] = KPI_DEFINITIONS.map(def => {
          const existing = globalRows.find((r: any) => r.config_key === def.key);
          if (existing) {
            const val = existing.config_value ?? {};
            return {
              key: def.key,
              target: val.target ?? def.defaultTarget,
              critical: val.critical ?? def.defaultCritical,
              is_mandatory: val.is_mandatory ?? existing.is_mandatory ?? false,
            };
          }
          return {
            key: def.key,
            target: def.defaultTarget,
            critical: def.defaultCritical,
            is_mandatory: false,
          };
        });
        setTargets(loaded);
      } catch (err) {
        console.error('Failed to load org KPI targets:', err);
        setTargets(KPI_DEFINITIONS.map(d => ({
          key: d.key,
          target: d.defaultTarget,
          critical: d.defaultCritical,
          is_mandatory: false,
        })));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function update(key: string, field: 'target' | 'critical' | 'is_mandatory', value: any) {
    setTargets(prev => prev.map(t => t.key === key ? { ...t, [field]: value } : t));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveOrgTargets(targets.map(t => ({
        key: t.key,
        target: t.target,
        critical: t.critical,
        is_mandatory: t.is_mandatory,
      })));
      toast({ title: 'Cibles globales sauvegardees', description: 'Les KPIs de l\'organisation ont ete mis a jour.' });
    } catch (err) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-display">Cibles KPI Organisation</CardTitle>
            <CardDescription>
              Definissez les objectifs par defaut pour toutes les agences.
              Verrouillez les KPIs obligatoires que les managers ne pourront pas modifier.
            </CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Sauvegarder
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {targets.map(t => {
            const def = KPI_DEFINITIONS.find(d => d.key === t.key);
            if (!def) return null;

            return (
              <div key={t.key} className="grid grid-cols-1 sm:grid-cols-[1fr_100px_100px_80px] gap-3 items-end p-3 rounded-lg border bg-card">
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="font-medium">{def.label}</Label>
                    {t.is_mandatory && (
                      <Badge variant="default" className="text-[10px] h-5">Obligatoire</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Cible ({def.unit || '#'})</Label>
                  <Input
                    type="number"
                    value={t.target}
                    onChange={e => update(t.key, 'target', Number(e.target.value))}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Critique ({def.unit || '#'})</Label>
                  <Input
                    type="number"
                    value={t.critical}
                    onChange={e => update(t.key, 'critical', Number(e.target.value))}
                    className="h-8"
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Label className="text-xs text-muted-foreground">Verrouiller</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => update(t.key, 'is_mandatory', !t.is_mandatory)}
                        className="p-2 rounded-md hover:bg-muted transition-colors"
                      >
                        {t.is_mandatory
                          ? <Lock className="h-4 w-4 text-primary" />
                          : <Unlock className="h-4 w-4 text-muted-foreground" />
                        }
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t.is_mandatory ? 'Ce KPI est obligatoire — les managers ne peuvent pas le modifier' : 'Cliquez pour rendre ce KPI obligatoire'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
