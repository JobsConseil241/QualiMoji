import { useState, useCallback } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Plus, Trash2, Eye, RotateCcw, MessageSquare, X, AlertTriangle,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import SmileyFace, { SMILEY_CONFIG } from '@/components/kiosk/SmileyFace';

/* ---------- types ---------- */
export interface QuestionOption {
  id: string;
  label: string;
  order: number;
}

export interface QuestionConfig {
  sentiment: string;
  emoji: string;
  label: string;
  question: string;
  options: QuestionOption[];
  allowFreeText: boolean;
  isActive: boolean;
}

const DEFAULT_EMOJIS = ['😞', '😠', '😢', '😤', '👎', '😐', '🤔', '😶', '🫤', '😊', '😍', '🤩', '👍', '🎉', '💯', '⭐', '❤️', '🙏'];

const DEFAULT_CONFIGS: QuestionConfig[] = [
  {
    sentiment: 'very_happy',
    emoji: '😊',
    label: 'Très satisfait',
    question: 'Qu\'avez-vous le plus apprécié ?',
    options: [
      { id: '1', label: 'Rapidité du service', order: 0 },
      { id: '2', label: 'Amabilité du personnel', order: 1 },
      { id: '3', label: 'Qualité du conseil', order: 2 },
      { id: '4', label: 'Cadre agréable', order: 3 },
    ],
    allowFreeText: true,
    isActive: true,
  },
  {
    sentiment: 'happy',
    emoji: '🙂',
    label: 'Satisfait',
    question: 'Qu\'est-ce qui pourrait être encore mieux ?',
    options: [
      { id: '5', label: 'Réduire le temps d\'attente', order: 0 },
      { id: '6', label: 'Améliorer l\'accueil', order: 1 },
      { id: '7', label: 'Plus de services en ligne', order: 2 },
    ],
    allowFreeText: true,
    isActive: true,
  },
  {
    sentiment: 'unhappy',
    emoji: '😕',
    label: 'Insatisfait',
    question: 'Qu\'est-ce qui vous a déçu ?',
    options: [
      { id: '8', label: 'Temps d\'attente trop long', order: 0 },
      { id: '9', label: 'Personnel peu aimable', order: 1 },
      { id: '10', label: 'Problème non résolu', order: 2 },
      { id: '11', label: 'Environnement désagréable', order: 3 },
    ],
    allowFreeText: true,
    isActive: true,
  },
  {
    sentiment: 'very_unhappy',
    emoji: '😞',
    label: 'Très insatisfait',
    question: 'Qu\'est-ce qui vous a le plus déçu ?',
    options: [
      { id: '12', label: 'Très long temps d\'attente', order: 0 },
      { id: '13', label: 'Mauvais accueil', order: 1 },
      { id: '14', label: 'Problème non résolu', order: 2 },
      { id: '15', label: 'Expérience très désagréable', order: 3 },
    ],
    allowFreeText: true,
    isActive: true,
  },
];

/* ---------- Sortable option item ---------- */
function SortableOption({
  option, onUpdate, onRemove, disabled,
}: {
  option: QuestionOption;
  onUpdate: (id: string, label: string) => void;
  onRemove: (id: string) => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: option.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border bg-card transition-shadow',
        isDragging && 'shadow-md z-10 opacity-80'
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground" disabled={disabled}>
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        value={option.label}
        onChange={(e) => onUpdate(option.id, e.target.value)}
        className="h-8 text-sm flex-1"
        disabled={disabled}
        maxLength={100}
      />
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => onRemove(option.id)} disabled={disabled}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* ---------- Sortable sentiment card wrapper ---------- */
function SortableSentimentCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={cn('relative', isDragging && 'z-10 opacity-80')}>
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-5 cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground z-10"
        title="Glisser pour réorganiser"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      {children}
    </div>
  );
}

/* ---------- Main component ---------- */
interface QuestionsConfigProps {
  configs: QuestionConfig[];
  onChange: (configs: QuestionConfig[]) => void;
}

export function QuestionsConfig({ configs, onChange }: QuestionsConfigProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const [emojiList, setEmojiList] = useState<string[]>(DEFAULT_EMOJIS);
  const [newEmojiInput, setNewEmojiInput] = useState('');
  const [editingEmojis, setEditingEmojis] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newSentiment, setNewSentiment] = useState({ emoji: '🙂', label: '', question: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const addEmoji = useCallback((emoji: string) => {
    const trimmed = emoji.trim();
    if (trimmed && !emojiList.includes(trimmed)) {
      setEmojiList((prev) => [...prev, trimmed]);
    }
    setNewEmojiInput('');
  }, [emojiList]);

  const removeEmoji = useCallback((emoji: string) => {
    setEmojiList((prev) => prev.filter((e) => e !== emoji));
  }, []);

  const updateConfig = useCallback((sentiment: string, updates: Partial<QuestionConfig>) => {
    onChange(configs.map((c) => (c.sentiment === sentiment ? { ...c, ...updates } : c)));
  }, [configs, onChange]);

  const updateOption = useCallback((sentiment: string, optionId: string, label: string) => {
    onChange(configs.map((c) =>
      c.sentiment === sentiment
        ? { ...c, options: c.options.map((o) => (o.id === optionId ? { ...o, label } : o)) }
        : c
    ));
  }, [configs, onChange]);

  const removeOption = useCallback((sentiment: string, optionId: string) => {
    onChange(configs.map((c) =>
      c.sentiment === sentiment
        ? { ...c, options: c.options.filter((o) => o.id !== optionId).map((o, i) => ({ ...o, order: i })) }
        : c
    ));
  }, [configs, onChange]);

  const addOption = useCallback((sentiment: string) => {
    const config = configs.find((c) => c.sentiment === sentiment);
    if (!config || config.options.length >= 6) return;
    const newOpt: QuestionOption = { id: crypto.randomUUID(), label: '', order: config.options.length };
    onChange(configs.map((c) =>
      c.sentiment === sentiment ? { ...c, options: [...c.options, newOpt] } : c
    ));
  }, [configs, onChange]);

  const handleDragEnd = useCallback((sentiment: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onChange(configs.map((c) => {
      if (c.sentiment !== sentiment) return c;
      const oldIdx = c.options.findIndex((o) => o.id === active.id);
      const newIdx = c.options.findIndex((o) => o.id === over.id);
      const reordered = arrayMove(c.options, oldIdx, newIdx).map((o, i) => ({ ...o, order: i }));
      return { ...c, options: reordered };
    }));
  }, [configs, onChange]);

  const restoreDefaults = useCallback((sentiment: string) => {
    const def = DEFAULT_CONFIGS.find((d) => d.sentiment === sentiment);
    if (def) {
      onChange(configs.map((c) => (c.sentiment === sentiment ? { ...def, options: def.options.map((o) => ({ ...o, id: crypto.randomUUID() })) } : c)));
    }
  }, [configs, onChange]);

  const addSentimentConfig = useCallback(() => {
    if (!newSentiment.label.trim()) return;
    const key = newSentiment.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (configs.some((c) => c.sentiment === key)) return;
    const newConfig: QuestionConfig = {
      sentiment: key,
      emoji: newSentiment.emoji,
      label: newSentiment.label,
      question: newSentiment.question || `Que pensez-vous de votre expérience ?`,
      options: [
        { id: crypto.randomUUID(), label: 'Option 1', order: 0 },
        { id: crypto.randomUUID(), label: 'Option 2', order: 1 },
      ],
      allowFreeText: true,
      isActive: true,
    };
    onChange([...configs, newConfig]);
    setNewSentiment({ emoji: '🙂', label: '', question: '' });
    setAddDialogOpen(false);
  }, [configs, onChange, newSentiment]);

  const removeSentimentConfig = useCallback((sentiment: string) => {
    onChange(configs.filter((c) => c.sentiment !== sentiment));
    setDeleteConfirm(null);
  }, [configs, onChange]);

  const handleSentimentDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = configs.findIndex((c) => c.sentiment === active.id);
    const newIdx = configs.findIndex((c) => c.sentiment === over.id);
    if (oldIdx !== -1 && newIdx !== -1) {
      onChange(arrayMove(configs, oldIdx, newIdx));
    }
  }, [configs, onChange]);

  const previewConfig = configs[previewIdx] || configs[0];

  const getValidationError = (config: QuestionConfig): string | null => {
    if (!config.isActive) return null;
    if (config.options.length < 2) return 'Au moins 2 options requises';
    if (config.options.some((o) => !o.label.trim())) return 'Options vides détectées';
    if (!config.question.trim()) return 'Question requise';
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-display font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Questions de suivi par sentiment
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Configurez les questions posées après l'évaluation initiale</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Ajouter un sentiment
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { setPreviewIdx(0); setPreviewOpen(true); }}>
            <Eye className="h-3.5 w-3.5" /> Prévisualiser
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSentimentDragEnd}>
        <SortableContext items={configs.map((c) => c.sentiment)} strategy={verticalListSortingStrategy}>
      {configs.map((config, idx) => {
        const error = getValidationError(config);
        const isDefault = DEFAULT_CONFIGS.some((d) => d.sentiment === config.sentiment);

        return (
          <SortableSentimentCard key={config.sentiment} id={config.sentiment}>
          <Card className={cn('glass-card transition-opacity pl-8', !config.isActive && 'opacity-60')}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      className="text-lg p-1.5 rounded-lg cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all bg-muted flex items-center justify-center"
                      onClick={() => setEmojiPickerFor(emojiPickerFor === config.sentiment ? null : config.sentiment)}
                      title="Changer l'emoji"
                    >
                      {SMILEY_CONFIG[config.sentiment] ? (
                        <SmileyFace sentiment={config.sentiment} size={28} />
                      ) : (
                        config.emoji
                      )}
                    </button>
                    {emojiPickerFor === config.sentiment && (
                      <div className="absolute top-full left-0 mt-1 z-20 bg-popover border rounded-lg shadow-lg p-2 w-64">
                        <div className="grid grid-cols-6 gap-1">
                          {emojiList.map((em) => (
                            <div key={em} className="relative group">
                              <button
                                type="button"
                                className={cn(
                                  'text-lg p-1 rounded hover:bg-accent transition-colors w-full',
                                  config.emoji === em && 'bg-primary/10 ring-1 ring-primary'
                                )}
                                onClick={() => {
                                  updateConfig(config.sentiment, { emoji: em });
                                  setEmojiPickerFor(null);
                                  setEditingEmojis(false);
                                }}
                              >
                                {em}
                              </button>
                              {editingEmojis && (
                                <button
                                  type="button"
                                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => { e.stopPropagation(); removeEmoji(em); }}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <Separator className="my-2" />
                        <div className="flex items-center gap-1">
                          <Input
                            value={newEmojiInput}
                            onChange={(e) => setNewEmojiInput(e.target.value)}
                            placeholder="Coller un emoji..."
                            className="h-7 text-sm flex-1"
                            maxLength={4}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmoji(newEmojiInput); } }}
                          />
                          <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => addEmoji(newEmojiInput)} disabled={!newEmojiInput.trim()}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant={editingEmojis ? 'default' : 'ghost'}
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => setEditingEmojis(!editingEmojis)}
                            title={editingEmojis ? 'Terminer' : 'Supprimer des emojis'}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={config.label}
                        onChange={(e) => updateConfig(config.sentiment, { label: e.target.value })}
                        className="h-7 text-sm font-display font-semibold border-transparent hover:border-input focus:border-input w-auto"
                        placeholder="Nom du sentiment"
                      />
                    </div>
                    {error && <CardDescription className="text-destructive text-xs mt-0.5">{error}</CardDescription>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isDefault && (
                    <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={() => restoreDefaults(config.sentiment)}>
                      <RotateCcw className="h-3 w-3" /> Défaut
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirm(config.sentiment)} title="Supprimer ce sentiment">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Switch checked={config.isActive} onCheckedChange={(v) => updateConfig(config.sentiment, { isActive: v })} />
                </div>
              </div>
            </CardHeader>
            <CardContent className={cn('space-y-4', !config.isActive && 'pointer-events-none')}>
              {/* Question */}
              <div className="space-y-1.5">
                <Label className="text-xs">Question principale</Label>
                <Input
                  value={config.question}
                  onChange={(e) => updateConfig(config.sentiment, { question: e.target.value })}
                  placeholder="Saisissez votre question..."
                  className="text-sm"
                  maxLength={200}
                />
              </div>

              {/* Options with drag & drop */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Options de réponse ({config.options.length}/6)</Label>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(config.sentiment)}>
                  <SortableContext items={config.options.map((o) => o.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1.5">
                      {config.options.map((opt) => (
                        <SortableOption
                          key={opt.id}
                          option={opt}
                          onUpdate={(id, label) => updateOption(config.sentiment, id, label)}
                          onRemove={(id) => removeOption(config.sentiment, id)}
                          disabled={!config.isActive}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                {config.options.length < 6 && (
                  <Button variant="outline" size="sm" className="w-full text-xs gap-1 mt-2 border-dashed" onClick={() => addOption(config.sentiment)}>
                    <Plus className="h-3 w-3" /> Ajouter une option
                  </Button>
                )}
              </div>

              {/* Free text toggle */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-sm font-medium">Texte libre</p>
                  <p className="text-xs text-muted-foreground">Permettre au client de saisir un commentaire</p>
                </div>
                <Switch
                  checked={config.allowFreeText}
                  onCheckedChange={(v) => updateConfig(config.sentiment, { allowFreeText: v })}
                />
              </div>
            </CardContent>
          </Card>
          </SortableSentimentCard>
        );
      })}
        </SortableContext>
      </DndContext>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Supprimer ce sentiment ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera le sentiment « {configs.find((c) => c.sentiment === deleteConfirm)?.label || ''} » ainsi que sa question et ses options de réponse. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && removeSentimentConfig(deleteConfirm)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Sentiment Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Nouveau sentiment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  className="text-2xl p-2 rounded-lg bg-muted cursor-pointer hover:ring-2 hover:ring-primary/30"
                  onClick={() => setEmojiPickerFor(emojiPickerFor === '__new__' ? null : '__new__')}
                >
                  {newSentiment.emoji}
                </button>
                {emojiPickerFor === '__new__' && (
                  <div className="absolute top-full left-0 mt-1 z-20 bg-popover border rounded-lg shadow-lg p-2 grid grid-cols-6 gap-1 w-52">
                    {emojiList.map((em) => (
                      <button
                        key={em}
                        type="button"
                        className={cn('text-lg p-1 rounded hover:bg-accent transition-colors', newSentiment.emoji === em && 'bg-primary/10 ring-1 ring-primary')}
                        onClick={() => { setNewSentiment((s) => ({ ...s, emoji: em })); setEmojiPickerFor(null); }}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Input
                  value={newSentiment.label}
                  onChange={(e) => setNewSentiment((s) => ({ ...s, label: e.target.value }))}
                  placeholder="Nom du sentiment (ex: Très insatisfait)"
                  className="text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Question de suivi</Label>
              <Input
                value={newSentiment.question}
                onChange={(e) => setNewSentiment((s) => ({ ...s, question: e.target.value }))}
                placeholder="Que pensez-vous de votre expérience ?"
                className="text-sm"
              />
            </div>
            <Button onClick={addSentimentConfig} disabled={!newSentiment.label.trim()} className="w-full gap-1.5">
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Aperçu Kiosk</DialogTitle>
          </DialogHeader>
          {previewConfig && (
            <div className="space-y-5">
              {/* Sentiment nav */}
              <div className="flex gap-2 justify-center flex-wrap">
                {configs.map((c, i) => (
                  <Button
                    key={c.sentiment}
                    variant={previewIdx === i ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => setPreviewIdx(i)}
                  >
                    {SMILEY_CONFIG[c.sentiment] ? (
                      <SmileyFace sentiment={c.sentiment} size={18} />
                    ) : (
                      c.emoji
                    )} {c.label.split(' ')[0]}
                  </Button>
                ))}
              </div>

              <Separator />

              {/* Kiosk preview */}
              <div className="bg-muted/50 rounded-xl p-5 space-y-4">
                <div className="text-center space-y-2 flex flex-col items-center">
                  {SMILEY_CONFIG[previewConfig.sentiment] ? (
                    <SmileyFace sentiment={previewConfig.sentiment} size={56} />
                  ) : (
                    <span className="text-3xl">{previewConfig.emoji}</span>
                  )}
                  <p className="font-display font-semibold text-sm">{previewConfig.question}</p>
                </div>

                {!previewConfig.isActive ? (
                  <p className="text-center text-xs text-muted-foreground italic">Question désactivée</p>
                ) : (
                  <div className="space-y-2">
                    {previewConfig.options.map((opt) => (
                      <button
                        key={opt.id}
                        className="w-full text-left px-4 py-2.5 rounded-lg border bg-card hover:bg-primary/5 hover:border-primary/30 transition-all text-sm"
                      >
                        {opt.label || '(option vide)'}
                      </button>
                    ))}
                    {previewConfig.allowFreeText && (
                      <div className="pt-1">
                        <div className="w-full px-4 py-2.5 rounded-lg border border-dashed bg-card text-sm text-muted-foreground">
                          Autre : saisissez votre réponse...
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {previewConfig.options.length} option{previewConfig.options.length > 1 ? 's' : ''}
                </Badge>
                {previewConfig.allowFreeText && <Badge variant="outline" className="text-[10px]">Texte libre</Badge>}
                <Badge variant={previewConfig.isActive ? 'default' : 'secondary'} className="text-[10px]">
                  {previewConfig.isActive ? 'Active' : 'Désactivée'}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { DEFAULT_CONFIGS };
