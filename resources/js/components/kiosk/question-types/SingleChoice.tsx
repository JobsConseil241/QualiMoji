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
  const selectedOtherOption = options.find((o) => o.id === value && o.is_other === true);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-center gap-2">
        {options.map((opt) => {
          const selected = value === opt.id;
          return (
            <Button
              key={opt.id}
              variant={selected ? 'default' : 'outline'}
              className={cn(
                'rounded-full px-6 py-5 h-auto text-base whitespace-normal',
                selected && 'ring-2 ring-primary',
              )}
              onClick={() => onChange(opt.id)}
            >
              {opt.label || 'Autre'}
            </Button>
          );
        })}
      </div>

      {selectedOtherOption && (
        <Input
          autoFocus
          value={otherTexts?.[selectedOtherOption.id] ?? ''}
          onChange={(e) => onOtherTextChange?.(selectedOtherOption.id, e.target.value)}
          placeholder="Précisez…"
          maxLength={200}
          className="max-w-md mx-auto"
        />
      )}
    </div>
  );
}
