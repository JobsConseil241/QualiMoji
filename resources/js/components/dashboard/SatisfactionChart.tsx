import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const PALETTE = [
  'hsl(199, 89%, 36%)',
  'hsl(164, 70%, 40%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 51%)',
  'hsl(280, 60%, 50%)',
  'hsl(330, 70%, 50%)',
  'hsl(210, 70%, 55%)',
  'hsl(140, 60%, 45%)',
  'hsl(25, 80%, 50%)',
  'hsl(300, 50%, 45%)',
];

interface SatisfactionChartProps {
  data: Record<string, any>[];
}

export function SatisfactionChart({ data }: SatisfactionChartProps) {
  // Dynamically extract branch names from data keys (excluding 'date')
  const branches = useMemo(() => {
    const keys = new Set<string>();
    data.forEach(row => {
      Object.keys(row).forEach(k => {
        if (k !== 'date') keys.add(k);
      });
    });
    return Array.from(keys);
  }, [data]);

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    branches.forEach((b, i) => {
      map[b] = PALETTE[i % PALETTE.length];
    });
    return map;
  }, [branches]);

  const [visible, setVisible] = useState<Record<string, boolean>>({});

  // Default all branches to visible
  const isVisible = (branch: string) => visible[branch] ?? true;

  const toggle = (branch: string) => {
    setVisible(prev => ({ ...prev, [branch]: !(prev[branch] ?? true) }));
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-display">Évolution de la satisfaction</CardTitle>
          <div className="flex flex-wrap gap-1.5">
            {branches.map((branch) => (
              <Badge
                key={branch}
                variant={isVisible(branch) ? 'default' : 'outline'}
                className="cursor-pointer text-[10px] px-2 py-0.5 transition-all select-none"
                style={{
                  backgroundColor: isVisible(branch) ? colorMap[branch] : 'transparent',
                  borderColor: colorMap[branch],
                  color: isVisible(branch) ? 'white' : colorMap[branch],
                }}
                onClick={() => toggle(branch)}
              >
                {branch.length > 12 ? branch.slice(0, 12) + '…' : branch}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(215, 13%, 50%)" />
            <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} stroke="hsl(215, 13%, 50%)" />
            <Tooltip
              contentStyle={{
                background: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(214, 20%, 90%)',
                borderRadius: '10px',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            />
            {branches.map(
              (branch) =>
                isVisible(branch) && (
                  <Line
                    key={branch}
                    type="monotone"
                    dataKey={branch}
                    stroke={colorMap[branch]}
                    strokeWidth={2}
                    dot={{ r: 3, fill: colorMap[branch] }}
                    activeDot={{ r: 5 }}
                    name={branch}
                  />
                )
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
