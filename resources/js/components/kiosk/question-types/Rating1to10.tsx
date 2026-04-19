import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
interface Props { value: number | null; onChange: (v: number) => void; }
export default function Rating1to10({ value, onChange }: Props) {
  return (
    <div className="flex justify-center gap-2 flex-wrap">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <Button
          key={n}
          size="lg"
          variant={value === n ? 'default' : 'outline'}
          onClick={() => onChange(n)}
          className={cn('w-12 h-12', value === n && 'ring-2 ring-primary')}
        >
          {n}
        </Button>
      ))}
    </div>
  );
}
