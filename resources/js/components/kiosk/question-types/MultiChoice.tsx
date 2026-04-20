import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  const selectedOthers = options.filter((o) => o.is_other === true && value.includes(o.id));

  const shouldScroll = options.length > 3;

  return (
    <div className="space-y-4">
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
          return (
            <Button
              key={opt.id}
              variant={selected ? 'default' : 'outline'}
              className={cn(
                'rounded-full px-5 py-2.5 h-auto text-sm md:text-base whitespace-normal',
                selected && 'ring-2 ring-primary',
              )}
              onClick={() => toggle(opt.id)}
            >
              {opt.label || 'Autre'}
            </Button>
          );
        })}
      </div>

      {selectedOthers.map((opt) => (
        <Input
          key={opt.id}
          value={otherTexts?.[opt.id] ?? ''}
          onChange={(e) => onOtherTextChange?.(opt.id, e.target.value)}
          placeholder={`Précisez pour « ${opt.label || 'Autre'} »…`}
          maxLength={200}
          className="max-w-md mx-auto"
        />
      ))}
    </div>
  );
}
