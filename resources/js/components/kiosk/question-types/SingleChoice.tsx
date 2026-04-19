import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OpenQuestionOption } from '@/types/questionnaire';

interface Props {
  options: OpenQuestionOption[];
  value: string | null;
  onChange: (v: string) => void;
}

export default function SingleChoice({ options, value, onChange }: Props) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <Button
          key={opt.id}
          variant={value === opt.id ? 'default' : 'outline'}
          className={cn('w-full justify-start h-14 text-base', value === opt.id && 'ring-2 ring-primary')}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
