import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props { value: number | null; onChange: (v: number) => void; }

const LABELS = ['Très facile', 'Facile', 'Moyen', 'Difficile', 'Très difficile'];

export default function Rating1to5({ value, onChange }: Props) {
  return (
    <div className="flex justify-center gap-3">
      {[1, 2, 3, 4, 5].map((n, i) => (
        <div key={n} className="flex flex-col items-center gap-1.5">
          <Button
            size="lg"
            variant={value === n ? 'default' : 'outline'}
            onClick={() => onChange(n)}
            className={cn('w-14 h-14 text-xl', value === n && 'ring-2 ring-primary')}
          >
            {n}
          </Button>
          <span className="text-[10px] text-muted-foreground text-center leading-tight whitespace-nowrap">
            {LABELS[i]}
          </span>
        </div>
      ))}
    </div>
  );
}
