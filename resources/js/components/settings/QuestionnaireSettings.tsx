import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { QuestionsConfig, type QuestionConfig } from '@/components/settings/QuestionsConfig';
import { OpenQuestionsEditor } from '@/components/settings/OpenQuestionsEditor';
import { BranchOverridePanel } from '@/components/settings/BranchOverridePanel';
import BranchContentEditor from '@/components/settings/BranchContentEditor';
import type {
  QuestionnaireMode, OpenQuestion, BranchModeEntry,
} from '@/types/questionnaire';

type SentimentKey = 'very_happy' | 'happy' | 'neutral' | 'unhappy' | 'very_unhappy';

const DEFAULT_INTRO_MESSAGES: Record<SentimentKey, string> = {
  very_happy: 'Formidable ! 🎉 Votre satisfaction nous fait plaisir. Dites-nous ce qui a rendu votre visite exceptionnelle.',
  happy: 'Merci pour votre confiance. Vos réponses nous aident à maintenir ce niveau de service.',
  neutral: 'Merci de votre passage. Pour nous aider à mieux comprendre votre ressenti, dites-nous ce qui pourrait être amélioré.',
  unhappy: "Nous regrettons que votre expérience n'ait pas été à la hauteur. Vos réponses nous aideront à progresser.",
  very_unhappy: "Nous sommes sincèrement désolés. Votre témoignage est précieux — prenons le temps d'écouter pour corriger ce qui doit l'être.",
};

const SENTIMENT_META: Record<SentimentKey, { emoji: string; label: string }> = {
  very_happy: { emoji: '😍', label: 'Très satisfait' },
  happy: { emoji: '😊', label: 'Satisfait' },
  neutral: { emoji: '😐', label: 'Neutre' },
  unhappy: { emoji: '😕', label: 'Insatisfait' },
  very_unhappy: { emoji: '😡', label: 'Très insatisfait' },
};

export default function QuestionnaireSettings() {
  const { toast } = useToast();
  const [orgMode, setOrgMode] = useState<QuestionnaireMode>('quadrimoji');
  const [branches, setBranches] = useState<BranchModeEntry[]>([]);
  const [quadConfigs, setQuadConfigs] = useState<QuestionConfig[]>([]);
  const [openQuestions, setOpenQuestions] = useState<OpenQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [pendingModeChange, setPendingModeChange] = useState<QuestionnaireMode | null>(null);
  const [editingBranch, setEditingBranch] = useState<{ branch: BranchModeEntry; mode: QuestionnaireMode } | null>(null);
  const [introMessages, setIntroMessages] = useState<Partial<Record<SentimentKey, string>>>({});

  const load = useCallback(async () => {
    const [modeRes, quadRes, openRes, kioskRes] = await Promise.all([
      api.get('/settings/questionnaire-mode'),
      api.get('/settings/questions'),
      api.get('/settings/open-questions'),
      api.get('/settings/kiosk'),
    ]);
    setOrgMode(modeRes.data.org_mode);
    setBranches(modeRes.data.branches);
    setQuadConfigs(quadRes.data.question_configs ?? []);
    setOpenQuestions(openRes.data.open_questions ?? []);
    setIntroMessages(kioskRes.data.kiosk_config?.wizard_intro_messages ?? {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirmModeChange = async (target: QuestionnaireMode, wipe: boolean) => {
    try {
      await api.put('/settings/questionnaire-mode', {
        mode: target,
        wipe_other_mode_config: wipe,
      });
      setOrgMode(target);
      toast({ title: 'Mode mis à jour' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.response?.data?.message, variant: 'destructive' });
    } finally {
      setPendingModeChange(null);
    }
  };

  const saveQuad = async () => {
    setSaving(true);
    try {
      await api.post('/settings/questions', { configs: quadConfigs });
      toast({ title: 'Questions enregistrées' });
    } finally { setSaving(false); }
  };

  const saveOpen = async () => {
    setSaving(true);
    try {
      await api.post('/settings/open-questions', {
        configs: openQuestions.map((q, i) => ({ ...q, sort_order: i })),
      });
      toast({ title: 'Questions enregistrées' });
    } finally { setSaving(false); }
  };

  const saveIntroMessages = async () => {
    setSaving(true);
    try {
      await api.post('/settings/kiosk', {
        wizard_intro_messages: introMessages,
      });
      toast({ title: 'Messages d\'introduction enregistrés' });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="org">
        <TabsList>
          <TabsTrigger value="org">Organisation</TabsTrigger>
          <TabsTrigger value="branches">Agences</TabsTrigger>
        </TabsList>

        <TabsContent value="org" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Mode du questionnaire</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={orgMode === 'quadrimoji'}
                    onChange={() => orgMode !== 'quadrimoji' && setPendingModeChange('quadrimoji')}
                  />
                  Quadrimoji (emojis + options)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={orgMode === 'open'}
                    onChange={() => orgMode !== 'open' && setPendingModeChange('open')}
                  />
                  Questions ouvertes
                </label>
              </div>
            </CardContent>
          </Card>

          {orgMode === 'quadrimoji' ? (
            <>
              <QuestionsConfig configs={quadConfigs} onChange={setQuadConfigs} />
              <Button onClick={saveQuad} disabled={saving}>Enregistrer</Button>
            </>
          ) : (
            <>
              <Label>Questions ouvertes (1-10)</Label>
              <OpenQuestionsEditor questions={openQuestions} onChange={setOpenQuestions} />
              <Button onClick={saveOpen} disabled={saving}>Enregistrer les questions</Button>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Messages d'introduction du wizard</CardTitle>
                  <CardDescription className="text-xs">
                    Affiché au-dessus des questions selon le smiley choisi par le client. Laissez vide pour utiliser le texte par défaut.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(Object.keys(SENTIMENT_META) as SentimentKey[]).map((key) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-2">
                        <span className="text-lg">{SENTIMENT_META[key].emoji}</span>
                        {SENTIMENT_META[key].label}
                      </Label>
                      <Textarea
                        value={introMessages[key] ?? ''}
                        onChange={(e) => setIntroMessages((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={DEFAULT_INTRO_MESSAGES[key]}
                        rows={2}
                        maxLength={500}
                        className="text-sm"
                      />
                    </div>
                  ))}
                  <Button onClick={saveIntroMessages} disabled={saving} size="sm">
                    Enregistrer les messages
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="branches">
          <BranchOverridePanel
            orgMode={orgMode}
            branches={branches}
            onOverride={async (branchId, mode) => {
              await api.put('/settings/questionnaire-mode', { mode, branch_id: branchId });
              await load();
              toast({ title: 'Surcharge appliquée' });
            }}
            onRestoreInherit={async (branchId) => {
              await api.put('/settings/questionnaire-mode', { mode: orgMode, branch_id: branchId });
              await load();
              toast({ title: 'Héritage restauré' });
            }}
            onEditContent={(branch, effectiveMode) => setEditingBranch({ branch, mode: effectiveMode })}
          />
        </TabsContent>
      </Tabs>

      {editingBranch && (
        <BranchContentEditor
          branchId={editingBranch.branch.branch_id}
          branchName={editingBranch.branch.name}
          effectiveMode={editingBranch.mode}
          open={editingBranch !== null}
          onClose={() => setEditingBranch(null)}
          onSaved={() => load()}
        />
      )}

      <AlertDialog open={pendingModeChange !== null} onOpenChange={(o) => !o && setPendingModeChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Changer le mode du questionnaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous passez en mode {pendingModeChange === 'open' ? '« Questions ouvertes »' : '« Quadrimoji »'}.
              Que faire de la configuration de l'autre mode ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <Button variant="outline" onClick={() => pendingModeChange && confirmModeChange(pendingModeChange, false)}>
              Conserver
            </Button>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => pendingModeChange && confirmModeChange(pendingModeChange, true)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
