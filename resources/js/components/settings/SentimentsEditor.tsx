import { useCallback } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import SmileyFace, { SMILEY_CONFIG } from '@/components/kiosk/SmileyFace';
import type { QuestionConfig } from '@/components/settings/QuestionsConfig';

const PRESET_SENTIMENTS: Array<Omit<QuestionConfig, 'options'>> = [
  { sentiment: 'very_happy', emoji: '😍', label: 'Très satisfait', question: '', allowFreeText: false, isActive: true },
  { sentiment: 'happy', emoji: '😊', label: 'Satisfait', question: '', allowFreeText: false, isActive: true },
  { sentiment: 'neutral', emoji: '😐', label: 'Neutre', question: '', allowFreeText: false, isActive: true },
  { sentiment: 'unhappy', emoji: '😕', label: 'Insatisfait', question: '', allowFreeText: false, isActive: true },
  { sentiment: 'very_unhappy', emoji: '😡', label: 'Très insatisfait', question: '', allowFreeText: false, isActive: true },
];

function SortableRow({
  config, onChange, onRemove,
}: {
  config: QuestionConfig;
  onChange: (next: QuestionConfig) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: config.sentiment });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const hasSmiley = !!SMILEY_CONFIG[config.sentiment];

  return (
    <Card ref={setNodeRef} style={style} className={cn('transition-shadow', isDragging && 'shadow-md z-10 opacity-80', !config.isActive && 'opacity-60')}>
      <CardContent className="p-3 flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab p-1 text-muted-foreground" aria-label="Réordonner">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex items-center justify-center w-12 h-12 shrink-0">
          {hasSmiley ? (
            <SmileyFace sentiment={config.sentiment} size={44} />
          ) : (
            <span className="text-3xl">{config.emoji}</span>
          )}
        </div>
        <Input
          value={config.label}
          onChange={(e) => onChange({ ...config, label: e.target.value })}
          placeholder="Libellé (ex: Très satisfait)"
          className="flex-1"
          maxLength={60}
        />
        <label className="flex items-center gap-2 text-xs whitespace-nowrap">
          <Switch
            checked={config.isActive}
            onCheckedChange={(v) => onChange({ ...config, isActive: v })}
          />
          Actif
        </label>
        <Button variant="ghost" size="icon" className="text-destructive" onClick={onRemove} aria-label="Supprimer">
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

interface Props {
  configs: QuestionConfig[];
  onChange: (configs: QuestionConfig[]) => void;
}

export function SentimentsEditor({ configs, onChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const updateConfig = (idx: number, next: QuestionConfig) => {
    const copy = [...configs];
    copy[idx] = next;
    onChange(copy);
  };

  const removeConfig = (sentiment: string) => {
    onChange(configs.filter((c) => c.sentiment !== sentiment));
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = configs.findIndex((c) => c.sentiment === active.id);
    const newIdx = configs.findIndex((c) => c.sentiment === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    onChange(arrayMove(configs, oldIdx, newIdx));
  }, [configs, onChange]);

  const missingPresets = PRESET_SENTIMENTS.filter(
    (p) => !configs.some((c) => c.sentiment === p.sentiment)
  );

  const addPreset = (preset: Omit<QuestionConfig, 'options'>) => {
    onChange([...configs, { ...preset, options: [] }]);
  };

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={configs.map((c) => c.sentiment)} strategy={verticalListSortingStrategy}>
          {configs.map((c, idx) => (
            <SortableRow
              key={c.sentiment}
              config={c}
              onChange={(next) => updateConfig(idx, next)}
              onRemove={() => removeConfig(c.sentiment)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {configs.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">
          Aucun smiley. Ajoute-en un ci-dessous.
        </p>
      )}

      {missingPresets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-xs text-muted-foreground self-center">Ajouter :</span>
          {missingPresets.map((p) => (
            <Button
              key={p.sentiment}
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => addPreset(p)}
            >
              <Plus className="h-3 w-3" />
              <span>{p.emoji}</span>
              <span>{p.label}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
