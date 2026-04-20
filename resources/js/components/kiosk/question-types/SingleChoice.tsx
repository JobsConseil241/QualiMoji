import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { OpenQuestionOption } from '@/types/questionnaire';

interface Props {
  options: OpenQuestionOption[];
  value: string | null;
  onChange: (v: string) => void;
  otherTexts?: Record<string, string>;
  onOtherTextChange?: (optionId: string, text: string) => void;
}

export default function SingleChoice({ options, value, onChange, otherTexts, onOtherTextChange }: Props) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const selected = value === opt.id;
        const showOther = selected && opt.is_other === true;
        return (
          <div key={opt.id} className="space-y-2">
            <Button
              variant={selected ? 'default' : 'outline'}
              className={cn('w-full justify-start h-14 text-base', selected && 'ring-2 ring-primary')}
              onClick={() => onChange(opt.id)}
            >
              {opt.label || 'Autre'}
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
