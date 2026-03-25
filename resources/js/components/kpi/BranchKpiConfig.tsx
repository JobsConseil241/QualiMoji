import { useState, useEffect } from 'react';
import { Loader2, Lock, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { fetchBranchTargets, saveBranchTargets } from '@/services/dataService';
import { cn } from '@/lib/utils';

interface BranchKpiConfigProps {
  branchId: string;
  branchName: string;
  isAdmin?: boolean;
}

const KPI_META: Record<string, { label: string; description: string; unit: string }> = {
  satisfaction_rate: { label: 'Score de satisfaction', description: 'Pourcentage de clients satisfaits ou tres satisfaits', unit: '%' },
  nps: { label: 'NPS', description: 'Net Promoter Score approxime', unit: 'pts' },
  dissatisfaction_rate: { label: "Taux d'insatisfaction", description: "Seuil d'alerte pour les feedbacks negatifs", unit: '%' },
  contact_rate: { label: 'Taux de contact', description: 'Part des clients ayant laisse un contact', unit: '%' },
  avg_alert_resolution_hours: { label: "Delai traitement alerte", description: "Temps max pour traiter une alerte", unit: 'h' },
  alert_resolution_rate: { label: "Taux alertes traitees", description: "Proportion d'alertes resolues", unit: '%' },
  follow_up_rate: { label: 'Taux de relance', description: 'Clients insatisfaits recontactes', unit: '%' },
  insatisfaction_resolution_rate: { label: 'Resolution insatisfactions', description: "Cas d'insatisfaction resolus", unit: '%' },
  avg_insatisfaction_resolution_hours: { label: 'Delai resolution', description: "De la detection a la cloture", unit: 'h' },
  feedbacks_per_month: { label: 'Feedbacks / mois', description: 'Volume minimum pour fiabilite statistique', unit: '' },
  distinct_issues_count: { label: "Raisons d'insatisfaction", description: 'Nombre min de raisons identifiees par mois', unit: '' },
  satisfaction_evolution: { label: 'Evolution satisfaction', description: 'Progression attendue en points', unit: 'pts' },
};

interface TargetRow {
  key: string;
  target: number;
  critical: number;
  is_mandatory?: boolean;
  is_custom?: boolean;
}

export function BranchKpiConfig({ branchId, branchName, isAdmin = false }: BranchKpiConfigProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [targets, setTargets] = useState<TargetRow[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchBranchTargets(branchId);
        const rows: TargetRow[] = Object.entries(data).map(([key, val]: [string, any]) => ({
          key,
          target: val.target,
          critical: val.critical,
          is_mandatory: val.is_mandatory,
          is_custom: val.is_custom,
        }));
        setTargets(rows);
      } catch (err) {
        console.error('Failed to load KPI targets:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [branchId]);

  function updateTarget(key: string, field: 'target' | 'critical', value: number) {
    setTargets(prev => prev.map(t => t.key === key ? { ...t, [field]: value } : t));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const toSave = targets
        .filter(t => !t.is_mandatory || isAdmin)
        .map(t => ({ key: t.key, target: t.target, critical: t.critical }));

      await saveBranchTargets(branchId, toSave);
      toast({ title: 'Cibles sauvegardees', description: `Les KPIs de ${branchName} ont ete mis a jour.` });
    } catch (err) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder les cibles.', variant: 'destructive' });
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
            <CardTitle className="text-base font-display">Configuration des KPIs</CardTitle>
            <CardDescription>Personnalisez les cibles et seuils critiques pour {branchName}</CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Sauvegarder
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {targets.map(t => {
            const meta = KPI_META[t.key];
            if (!meta) return null;

            const disabled = t.is_mandatory && !isAdmin;

            return (
              <div
                key={t.key}
                className={cn(
                  'grid grid-cols-1 sm:grid-cols-[1fr_120px_120px] gap-3 items-end p-3 rounded-lg border',
                  disabled ? 'bg-muted/50 opacity-75' : 'bg-card'
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="font-medium">{meta.label}</Label>
                    {t.is_mandatory && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>KPI obligatoire - defini par l'administration</TooltipContent>
                      </Tooltip>
                    )}
                    {t.is_custom && (
                      <Badge variant="outline" className="text-xs">Personnalise</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Cible ({meta.unit || '#'})</Label>
                  <Input
                    type="number"
                    value={t.target}
                    onChange={e => updateTarget(t.key, 'target', Number(e.target.value))}
                    disabled={disabled}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Critique ({meta.unit || '#'})</Label>
                  <Input
                    type="number"
                    value={t.critical}
                    onChange={e => updateTarget(t.key, 'critical', Number(e.target.value))}
                    disabled={disabled}
                    className="h-8"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
