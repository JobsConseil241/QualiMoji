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

export default function OpenQuestionsWizard({ questions, onSubmit }: Props) {
  const active = useMemo(
    () => questions.filter((q) => q.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [questions],
  );
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  if (active.length === 0) {
    return null;
  }

  const q = active[idx];
  const key = q.id ?? `idx-${idx}`;
  const value = answers[key];
  const canNext = !q.is_required || !isEmpty(q.type, value);

  const update = (v: any) => setAnswers((prev) => ({ ...prev, [key]: v }));

  const next = () => {
    if (idx < active.length - 1) setIdx(idx + 1);
    else finish();
  };

  const finish = () => {
    const payload: OpenAnswer[] = active.map((qq, i) => {
      const k = qq.id ?? `idx-${i}`;
      const v = answers[k];
      return {
        question_id: qq.id ?? '',
        type: qq.type,
        answer: v === undefined ? null : v,
      };
    });
    onSubmit(payload);
  };

  const Renderer = () => {
    switch (q.type) {
      case 'short_text':   return <ShortText value={value ?? ''} onChange={update} />;
      case 'long_text':    return <LongText value={value ?? ''} onChange={update} />;
      case 'rating_1_5':   return <Rating1to5 value={value ?? null} onChange={update} />;
      case 'rating_1_10':  return <Rating1to10 value={value ?? null} onChange={update} />;
      case 'single_choice': return <SingleChoice options={q.options ?? []} value={value ?? null} onChange={update} />;
      case 'multi_choice':  return <MultiChoice options={q.options ?? []} value={value ?? []} onChange={update} />;
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 p-6">
      <div className="flex justify-center gap-1.5">
        {active.map((_, i) => (
          <span key={i} className={cn('h-2 w-2 rounded-full', i <= idx ? 'bg-primary' : 'bg-muted')} />
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">Question {idx + 1} sur {active.length}</p>

      <h2 className="text-xl font-semibold text-center">
        {q.label}
        {q.is_required && <span className="text-destructive ml-1">*</span>}
      </h2>

      <Renderer />

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}>
          Précédent
        </Button>
        <Button onClick={next} disabled={!canNext}>
          {idx < active.length - 1 ? 'Suivant' : 'Terminer'}
        </Button>
      </div>

      {q.is_required && !canNext && (
        <p className="text-center text-xs text-destructive">* Cette question est obligatoire</p>
      )}
    </div>
  );
}
