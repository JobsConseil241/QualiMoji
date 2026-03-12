import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const periods = [
  { label: "Aujourd'hui", value: 'today' },
  { label: '7 derniers jours', value: '7d' },
  { label: '30 derniers jours', value: '30d' },
  { label: '90 derniers jours', value: '90d' },
] as const;

type PeriodValue = (typeof periods)[number]['value'] | 'custom';

interface PeriodSelectorProps {
  onChange?: (value: PeriodValue) => void;
}

export function PeriodSelector({ onChange }: PeriodSelectorProps) {
  const [selected, setSelected] = useState<PeriodValue>('30d');

  const selectedLabel = periods.find((p) => p.value === selected)?.label || 'Personnalisé';

  const handleSelect = (value: PeriodValue) => {
    setSelected(value);
    onChange?.(value);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-normal">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">{selectedLabel}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {periods.map((period) => (
          <DropdownMenuItem
            key={period.value}
            onClick={() => handleSelect(period.value)}
            className={selected === period.value ? 'bg-muted font-medium' : ''}
          >
            {period.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleSelect('custom')}>
          <Calendar className="h-3.5 w-3.5 mr-2" />
          Personnalisé…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
