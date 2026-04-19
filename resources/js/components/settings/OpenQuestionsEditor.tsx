import { useCallback } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { OpenQuestion, OpenQuestionType } from '@/types/questionnaire';

const TYPE_LABELS: Record<OpenQuestionType, string> = {
  short_text: 'Texte court',
  long_text: 'Texte long',
  rating_1_5: 'Note 1-5',
  rating_1_10: 'Note 1-10',
  single_choice: 'Choix unique',
  multi_choice: 'Choix multiple',
};

const MAX_QUESTIONS = 10;

function SortableRow({
  question, index, onChange, onRemove,
}: {
  question: OpenQuestion;
  index: number;
  onChange: (q: OpenQuestion) => void;
  onRemove: () => void;
}) {
  const key = question.id ?? `idx-${index}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: key });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const showOptions = question.type === 'single_choice' || question.type === 'multi_choice';

  const updateOption = (optIdx: number, label: string) => {
    const options = [...(question.options ?? [])];
    options[optIdx] = { ...options[optIdx], label };
    onChange({ ...question, options });
  };

  const addOption = () => {
    const options = [...(question.options ?? []), { id: crypto.randomUUID(), label: '' }];
    onChange({ ...question, options });
  };

  const removeOption = (optIdx: number) => {
    const options = (question.options ?? []).filter((_, i) => i !== optIdx);
    onChange({ ...question, options });
  };

  return (
    <Card ref={setNodeRef} style={style} className={cn('transition-shadow', isDragging && 'shadow-md z-10 opacity-80')}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <button {...attributes} {...listeners} className="cursor-grab p-1 text-muted-foreground" aria-label="Réordonner">
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold text-muted-foreground">Q{index + 1}</span>
          <Input
            value={question.label}
            onChange={(e) => onChange({ ...question, label: e.target.value })}
            placeholder="Texte de la question"
            className="flex-1"
            maxLength={300}
          />
          <Select
            value={question.type}
            onValueChange={(v) => onChange({ ...question, type: v as OpenQuestionType })}
          >
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(TYPE_LABELS) as OpenQuestionType[]).map((t) => (
                <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={onRemove} aria-label="Supprimer la question">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {showOptions && (
          <div className="space-y-1.5 pl-8">
            <Label className="text-xs">Options de réponse</Label>
            {(question.options ?? []).map((opt, optIdx) => (
              <div key={opt.id} className="flex items-center gap-2">
                <Input
                  value={opt.label}
                  onChange={(e) => updateOption(optIdx, e.target.value)}
                  placeholder={`Option ${optIdx + 1}`}
                  className="h-8 text-sm"
                  maxLength={200}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeOption(optIdx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="text-xs" onClick={addOption}>
              <Plus className="h-3 w-3 mr-1" /> Ajouter une option
            </Button>
          </div>
        )}

        <div className="flex items-center gap-4 pl-8">
          <label className="flex items-center gap-2 text-xs">
            <Switch
              checked={question.is_required}
              onCheckedChange={(v) => onChange({ ...question, is_required: v })}
            />
            Obligatoire
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Switch
              checked={question.is_active}
              onCheckedChange={(v) => onChange({ ...question, is_active: v })}
            />
            Active
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

interface Props {
  questions: OpenQuestion[];
  onChange: (questions: OpenQuestion[]) => void;
}

export function OpenQuestionsEditor({ questions, onChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const addQuestion = useCallback(() => {
    if (questions.length >= MAX_QUESTIONS) return;
    const q: OpenQuestion = {
      id: crypto.randomUUID(),
      label: '',
      type: 'short_text',
      options: [],
      is_required: false,
      is_active: true,
      sort_order: questions.length,
    };
    onChange([...questions, q]);
  }, [questions, onChange]);

  const updateQuestion = (idx: number, next: OpenQuestion) => {
    const copy = [...questions];
    copy[idx] = next;
    onChange(copy);
  };

  const removeQuestion = (idx: number) => {
    onChange(questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, sort_order: i })));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = questions.map((q, i) => q.id ?? `idx-${i}`);
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx < 0 || newIdx < 0) return;
    onChange(arrayMove(questions, oldIdx, newIdx).map((q, i) => ({ ...q, sort_order: i })));
  };

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={questions.map((q, i) => q.id ?? `idx-${i}`)} strategy={verticalListSortingStrategy}>
          {questions.map((q, idx) => (
            <SortableRow
              key={q.id ?? `idx-${idx}`}
              question={q}
              index={idx}
              onChange={(next) => updateQuestion(idx, next)}
              onRemove={() => removeQuestion(idx)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button
        variant="outline"
        className="w-full border-dashed gap-1.5"
        onClick={addQuestion}
        disabled={questions.length >= MAX_QUESTIONS}
      >
        <Plus className="h-4 w-4" />
        Ajouter une question ({questions.length}/{MAX_QUESTIONS})
      </Button>
    </div>
  );
}
