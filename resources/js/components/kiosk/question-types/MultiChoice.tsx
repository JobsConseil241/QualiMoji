import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OpenQuestionOption } from '@/types/questionnaire';

interface Props {
  options: OpenQuestionOption[];
  value: string[];
  onChange: (v: string[]) => void;
}

export default function MultiChoice({ options, value, onChange }: Props) {
  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const selected = value.includes(opt.id);
        return (
          <Button
            key={opt.id}
            variant={selected ? 'default' : 'outline'}
            className={cn('w-full justify-between h-14 text-base', selected && 'ring-2 ring-primary')}
            onClick={() => toggle(opt.id)}
          >
            <span>{opt.label}</span>
            {selected && <Check className="h-4 w-4" />}
          </Button>
        );
      })}
    </div>
  );
}
