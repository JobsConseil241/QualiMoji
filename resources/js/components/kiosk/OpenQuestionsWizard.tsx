import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ShortText from '@/components/kiosk/question-types/ShortText';
import LongText from '@/components/kiosk/question-types/LongText';
import Rating1to5 from '@/components/kiosk/question-types/Rating1to5';
import Rating1to10 from '@/components/kiosk/question-types/Rating1to10';
import SingleChoice from '@/components/kiosk/question-types/SingleChoice';
import MultiChoice from '@/components/kiosk/question-types/MultiChoice';
import type { OpenAnswer, OpenQuestion } from '@/types/questionnaire';

interface Props {
  questions: OpenQuestion[];
  onSubmit: (answers: OpenAnswer[]) => void;
}

function isEmpty(type: OpenQuestion['type'], value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (type === 'multi_choice') return Array.isArray(value) && value.length === 0;
  if (type === 'short_text' || type === 'long_text' || type === 'single_choice') {
    return typeof value === 'string' && value.trim() === '';
  }
  return false;
}

// Returns true if the user picked an "Autre" option but left the precision text empty.
function missingOtherText(q: OpenQuestion, value: unknown, otherTexts: Record<string, string> | undefined): boolean {
  if (!q.options?.length) return false;
  const selectedIds = q.type === 'multi_choice' && Array.isArray(value)
    ? value
    : q.type === 'single_choice' && typeof value === 'string' && value
    ? [value]
    : [];
  for (const id of selectedIds) {
    const opt = q.options.find((o) => o.id === id);
    if (opt?.is_other && !(otherTexts?.[id] ?? '').trim()) {
      return true;
    }
  }
  return false;
}

export default function OpenQuestionsWizard({ questions, onSubmit }: Props) {
  const active = useMemo(
    () => questions.filter((q) => q.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [questions],
  );
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, Record<string, string>>>({});

  if (active.length === 0) {
    return null;
  }

  const q = active[idx];
  const key = q.id ?? `idx-${idx}`;
  const value = answers[key];
  const questionOtherTexts = otherTexts[key];

  const hasEmptyOther = missingOtherText(q, value, questionOtherTexts);
  const canNext = (!q.is_required || !isEmpty(q.type, value)) && !hasEmptyOther;

  const update = (v: any) => setAnswers((prev) => ({ ...prev, [key]: v }));
  const updateOtherText = (optId: string, text: string) => {
    setOtherTexts((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? {}), [optId]: text },
    }));
  };

  const next = () => {
    if (idx < active.length - 1) setIdx(idx + 1);
    else finish();
  };

  const finish = () => {
    const payload: OpenAnswer[] = active.map((qq, i) => {
      const k = qq.id ?? `idx-${i}`;
      const v = answers[k];
      const texts = otherTexts[k];
      const answer: OpenAnswer = {
        question_id: qq.id ?? '',
        type: qq.type,
        answer: v === undefined ? null : v,
      };
      // Only attach other_texts for the options that are both selected AND is_other
      if (texts && qq.options?.length) {
        const selectedIds = qq.type === 'multi_choice' && Array.isArray(v)
          ? v
          : qq.type === 'single_choice' && typeof v === 'string' && v
          ? [v]
          : [];
        const filtered: Record<string, string> = {};
        for (const id of selectedIds) {
          const opt = qq.options.find((o) => o.id === id);
          if (opt?.is_other && texts[id]) {
            filtered[id] = texts[id];
          }
        }
        if (Object.keys(filtered).length > 0) {
          answer.other_texts = filtered;
        }
      }
      return answer;
    });
    onSubmit(payload);
  };

  const Renderer = () => {
    switch (q.type) {
      case 'short_text':   return <ShortText value={value ?? ''} onChange={update} />;
      case 'long_text':    return <LongText value={value ?? ''} onChange={update} />;
      case 'rating_1_5':   return <Rating1to5 value={value ?? null} onChange={update} />;
      case 'rating_1_10':  return <Rating1to10 value={value ?? null} onChange={update} />;
      case 'single_choice': return <SingleChoice options={q.options ?? []} value={value ?? null} onChange={update} otherTexts={questionOtherTexts} onOtherTextChange={updateOtherText} />;
      case 'multi_choice':  return <MultiChoice options={q.options ?? []} value={value ?? []} onChange={update} otherTexts={questionOtherTexts} onOtherTextChange={updateOtherText} />;
    }
  };

  const isLast = idx === active.length - 1;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-3 p-4 max-h-[calc(100vh-10rem)]">
      <div className="flex justify-center gap-1.5 flex-shrink-0">
        {active.map((_, i) => (
          <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i <= idx ? 'bg-primary' : 'bg-muted')} />
        ))}
      </div>
      <p className="text-center text-[11px] text-muted-foreground flex-shrink-0">Question {idx + 1} sur {active.length}</p>

      <h2 className="text-base sm:text-lg md:text-xl font-semibold text-center px-2 flex-shrink-0">
        {q.label}
        {q.is_required && <span className="text-destructive ml-1">*</span>}
      </h2>

      <div className="flex-1 min-h-0 overflow-y-auto py-2">
        <Renderer />
      </div>

      {q.is_required && isEmpty(q.type, value) && (
        <p className="text-center text-xs text-destructive">* Cette question est obligatoire</p>
      )}
      {hasEmptyOther && (
        <p className="text-center text-xs text-destructive">Merci de préciser votre réponse dans le champ « Autre »</p>
      )}

      <div className="flex justify-between items-center gap-4 pt-2">
        <Button variant="ghost" size="lg" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}>
          Précédent
        </Button>
        <Button size="lg" onClick={next} disabled={!canNext} className="min-w-32">
          {isLast ? 'Envoyer' : 'Suivant'}
        </Button>
      </div>
    </div>
  );
}
