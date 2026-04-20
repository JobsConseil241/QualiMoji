import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
interface Props { value: number | null; onChange: (v: number) => void; }
export default function Rating1to5({ value, onChange }: Props) {
  return (
    <div className="flex justify-center gap-3">
      {[1, 2, 3, 4, 5].map((n) => (
        <Button
          key={n}
          size="lg"
          variant={value === n ? 'default' : 'outline'}
          onClick={() => onChange(n)}
          className={cn('w-14 h-14 text-xl', value === n && 'ring-2 ring-primary')}
        >
          {n}
        </Button>
      ))}
    </div>
  );
}
