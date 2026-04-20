import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OpenQuestionOption } from '@/types/questionnaire';

interface Props {
  options: OpenQuestionOption[];
  value: string[];
  onChange: (v: string[]) => void;
  otherTexts?: Record<string, string>;
  onOtherTextChange?: (optionId: string, text: string) => void;
}

export default function MultiChoice({ options, value, onChange, otherTexts, onOtherTextChange }: Props) {
  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const selected = value.includes(opt.id);
        const showOther = selected && opt.is_other === true;
        return (
          <div key={opt.id} className="space-y-2">
            <Button
              variant={selected ? 'default' : 'outline'}
              className={cn('w-full justify-between h-14 text-base', selected && 'ring-2 ring-primary')}
              onClick={() => toggle(opt.id)}
            >
              <span>{opt.label || 'Autre'}</span>
              {selected && <Check className="h-4 w-4" />}
            </Button>
            {showOther && (
              <Input
                autoFocus
                value={otherTexts?.[opt.id] ?? ''}
                onChange={(e) => onOtherTextChange?.(opt.id, e.target.value)}
                placeholder="Précisez…"
                maxLength={200}
                className="ml-4 w-[calc(100%-1rem)]"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
