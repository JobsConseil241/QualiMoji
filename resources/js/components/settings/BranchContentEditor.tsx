import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { QuestionsConfig, type QuestionConfig } from '@/components/settings/QuestionsConfig';
import { OpenQuestionsEditor } from '@/components/settings/OpenQuestionsEditor';
import type { OpenQuestion, QuestionnaireMode } from '@/types/questionnaire';

interface Props {
  branchId: string;
  branchName: string;
  effectiveMode: QuestionnaireMode;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function BranchContentEditor({
  branchId, branchName, effectiveMode, open, onClose, onSaved,
}: Props) {
  const { toast } = useToast();
  const [quadConfigs, setQuadConfigs] = useState<QuestionConfig[]>([]);
  const [openQuestions, setOpenQuestions] = useState<OpenQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasBranchSpecific, setHasBranchSpecific] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const endpoint = effectiveMode === 'open' ? '/settings/open-questions' : '/settings/questions';
    api.get(endpoint, { params: { branch_id: branchId } })
      .then(({ data }) => {
        if (effectiveMode === 'open') {
          const qs = (data.open_questions ?? []) as OpenQuestion[];
          setOpenQuestions(qs);
          setHasBranchSpecific(qs.length > 0);
        } else {
          const cfgs = (data.question_configs ?? []) as QuestionConfig[];
          setQuadConfigs(cfgs);
          setHasBranchSpecific(cfgs.length > 0);
        }
      })
      .finally(() => setLoading(false));
  }, [open, branchId, effectiveMode]);

  const save = async () => {
    setSaving(true);
    try {
      if (effectiveMode === 'open') {
        await api.post('/settings/open-questions', {
          branch_id: branchId,
          configs: openQuestions.map((q, i) => ({ ...q, sort_order: i })),
        });
      } else {
        await api.post('/settings/questions', {
          branch_id: branchId,
          configs: quadConfigs.map((c, i) => ({ ...c, sort_order: i })),
        });
      }
      toast({ title: 'Enregistré', description: `Questions de ${branchName} mises à jour` });
      onSaved();
      onClose();
    } catch (e: any) {
      toast({
        title: 'Erreur',
        description: e?.response?.data?.message ?? 'Échec de l\'enregistrement',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const isEmpty = effectiveMode === 'open' ? openQuestions.length === 0 : quadConfigs.length === 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Questionnaire — {branchName}</DialogTitle>
          <DialogDescription>
            Mode : {effectiveMode === 'open' ? 'Questions ouvertes' : 'Quadrimoji'}.
            {!hasBranchSpecific && !loading && (
              <span className="block mt-1 text-xs">
                Cette agence hérite actuellement du questionnaire de l'organisation.
                Ajoute des questions ci-dessous pour créer une surcharge spécifique à cette agence.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Chargement…</div>
        ) : effectiveMode === 'open' ? (
          <OpenQuestionsEditor questions={openQuestions} onChange={setOpenQuestions} />
        ) : (
          <QuestionsConfig configs={quadConfigs} onChange={setQuadConfigs} />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={save} disabled={saving || isEmpty}>
            {saving ? 'Enregistrement…' : 'Enregistrer la surcharge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
