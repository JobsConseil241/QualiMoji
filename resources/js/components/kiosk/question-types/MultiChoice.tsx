import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check } from 'lucide-react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { OpenQuestionOption } from '@/types/questionnaire';

interface Props {
  options: OpenQuestionOption[];
  value: string[];
  onChange: (v: string[]) => void;
  otherTexts?: Record<string, string>;
  onOtherTextChange?: (optionId: string, text: string) => void;
}

const MAX_SELECTIONS = 3;

export default function MultiChoice({ options, value, onChange, otherTexts, onOtherTextChange }: Props) {
  const [otherModalFor, setOtherModalFor] = useState<OpenQuestionOption | null>(null);
  const [otherDraft, setOtherDraft] = useState('');

  const toggle = (opt: OpenQuestionOption) => {
    const isSelected = value.includes(opt.id);

    if (isSelected) {
      onChange(value.filter((v) => v !== opt.id));
      if (opt.is_other) onOtherTextChange?.(opt.id, '');
      return;
    }

    if (value.length >= MAX_SELECTIONS) return;

    if (opt.is_other) {
      setOtherDraft(otherTexts?.[opt.id] ?? '');
      setOtherModalFor(opt);
      return;
    }

    onChange([...value, opt.id]);
  };

  const confirmOther = () => {
    if (!otherModalFor) return;
    const trimmed = otherDraft.trim();
    if (!trimmed) return;
    onOtherTextChange?.(otherModalFor.id, trimmed);
    if (!value.includes(otherModalFor.id)) {
      onChange([...value, otherModalFor.id]);
    }
    setOtherModalFor(null);
    setOtherDraft('');
  };

  const cancelOther = () => {
    setOtherModalFor(null);
    setOtherDraft('');
  };

  const shouldScroll = options.length > 3;
  const atMax = value.length >= MAX_SELECTIONS;

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'flex flex-wrap justify-center gap-2',
          shouldScroll && 'max-h-[calc(38vh-30px)] overflow-y-auto p-2 rounded-lg border border-border/40',
          shouldScroll && '[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full',
        )}
        style={shouldScroll ? { WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', scrollbarWidth: 'thin', scrollbarColor: 'rgba(148,163,184,0.5) transparent' } : undefined}
      >
        {options.map((opt) => {
          const selected = value.includes(opt.id);
          const disabled = !selected && atMax;
          const otherText = opt.is_other && selected ? otherTexts?.[opt.id] : undefined;
          return (
            <Button
              key={opt.id}
              variant={selected ? 'default' : 'outline'}
              disabled={disabled}
              className={cn(
                'rounded-full px-5 py-2.5 h-auto text-sm md:text-base whitespace-normal',
                selected && 'ring-2 ring-primary',
                disabled && 'opacity-40',
              )}
              onClick={() => toggle(opt)}
            >
              <span>{opt.label || 'Autres à préciser'}</span>
              {otherText && <span className="ml-1 text-xs opacity-80">: {otherText}</span>}
              {selected && <Check className="h-4 w-4 ml-2" />}
            </Button>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {value.length} / {MAX_SELECTIONS} choix {atMax && '· maximum atteint'}
      </p>

      <Dialog open={otherModalFor !== null} onOpenChange={(open) => { if (!open) cancelOther(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Précisez votre réponse</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={otherDraft}
            onChange={(e) => setOtherDraft(e.target.value)}
            placeholder="Votre précision…"
            maxLength={200}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && otherDraft.trim()) {
                e.preventDefault();
                confirmOther();
              }
            }}
            className="text-base"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={cancelOther}>Annuler</Button>
            <Button onClick={confirmOther} disabled={!otherDraft.trim()}>Valider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
