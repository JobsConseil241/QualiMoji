import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { QuestionsConfig, type QuestionConfig } from '@/components/settings/QuestionsConfig';
import { OpenQuestionsEditor } from '@/components/settings/OpenQuestionsEditor';
import { SentimentsEditor } from '@/components/settings/SentimentsEditor';
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
  const [sentimentConfigs, setSentimentConfigs] = useState<QuestionConfig[]>([]);
  const [openQuestions, setOpenQuestions] = useState<OpenQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasBranchSpecific, setHasBranchSpecific] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const normalizeConfig = (raw: any): QuestionConfig => ({
      sentiment: raw.sentiment,
      emoji: raw.emoji ?? '',
      label: raw.label ?? '',
      question: raw.question ?? '',
      options: Array.isArray(raw.options) ? raw.options : [],
      allowFreeText: raw.allow_free_text ?? raw.allowFreeText ?? false,
      isActive: raw.is_active ?? raw.isActive ?? true,
    });

    if (effectiveMode === 'open') {
      // Open mode: load both open_questions AND question_configs (for sentiments)
      Promise.all([
        api.get('/settings/open-questions', { params: { branch_id: branchId } }),
        api.get('/settings/questions', { params: { branch_id: branchId } }),
      ])
        .then(([openRes, questionsRes]) => {
          const qs = (openRes.data.open_questions ?? []) as OpenQuestion[];
          const sentiments = (questionsRes.data.question_configs ?? []).map(normalizeConfig);
          setOpenQuestions(qs);
          setSentimentConfigs(sentiments);
          setHasBranchSpecific(qs.length > 0 || sentiments.length > 0);
        })
        .finally(() => setLoading(false));
    } else {
      api.get('/settings/questions', { params: { branch_id: branchId } })
        .then(({ data }) => {
          const cfgs = (data.question_configs ?? []).map(normalizeConfig);
          setQuadConfigs(cfgs);
          setHasBranchSpecific(cfgs.length > 0);
        })
        .finally(() => setLoading(false));
    }
  }, [open, branchId, effectiveMode]);

  const save = async () => {
    setSaving(true);
    try {
      if (effectiveMode === 'open') {
        // Save sentiments (only emoji/label/active matter in open mode — options/question stay empty)
        await api.post('/settings/questions', {
          branch_id: branchId,
          configs: sentimentConfigs.map((c, i) => ({
            sentiment: c.sentiment,
            emoji: c.emoji,
            label: c.label,
            question: c.question ?? '',
            options: c.options ?? [],
            allow_free_text: c.allowFreeText ?? false,
            is_active: c.isActive ?? true,
            sort_order: i,
          })),
        });
        await api.post('/settings/open-questions', {
          branch_id: branchId,
          configs: openQuestions.map((q, i) => ({ ...q, sort_order: i })),
        });
      } else {
        await api.post('/settings/questions', {
          branch_id: branchId,
          configs: quadConfigs.map((c, i) => ({
            sentiment: c.sentiment,
            emoji: c.emoji,
            label: c.label,
            question: c.question,
            options: c.options,
            allow_free_text: c.allowFreeText,
            is_active: c.isActive,
            sort_order: i,
          })),
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

  const isEmpty = effectiveMode === 'open'
    ? (openQuestions.length === 0 && sentimentConfigs.length === 0)
    : quadConfigs.length === 0;

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
                Ajoute des éléments ci-dessous pour créer une surcharge spécifique à cette agence.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Chargement…</div>
        ) : effectiveMode === 'open' ? (
          <div className="space-y-6">
            <section className="space-y-2">
              <div>
                <h3 className="text-sm font-display font-semibold">Smileys d'accueil</h3>
                <p className="text-xs text-muted-foreground">
                  Choisis quels smileys (et combien) afficher au début du formulaire.
                </p>
              </div>
              <SentimentsEditor configs={sentimentConfigs} onChange={setSentimentConfigs} />
            </section>

            <Separator />

            <section className="space-y-2">
              <div>
                <h3 className="text-sm font-display font-semibold">Questions ouvertes</h3>
                <p className="text-xs text-muted-foreground">
                  Posées une par une après le choix du smiley.
                </p>
              </div>
              <OpenQuestionsEditor questions={openQuestions} onChange={setOpenQuestions} />
            </section>
          </div>
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
