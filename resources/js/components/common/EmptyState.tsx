import { MessageSquare, Bell, Search, FileBarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  type: 'feedbacks' | 'alerts' | 'search' | 'reports' | 'generic';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const configs = {
  feedbacks: {
    icon: MessageSquare,
    emoji: '📭',
    defaultTitle: 'Aucun feedback aujourd\'hui',
    defaultDesc: 'Les feedbacks des clients apparaîtront ici dès qu\'ils seront collectés.',
  },
  alerts: {
    icon: Bell,
    emoji: '🎉',
    defaultTitle: 'Aucune alerte — Tout va bien !',
    defaultDesc: 'Tous les indicateurs sont dans les seuils. Continuez comme ça !',
  },
  search: {
    icon: Search,
    emoji: '🔍',
    defaultTitle: 'Aucun résultat trouvé',
    defaultDesc: 'Essayez de modifier vos critères de recherche ou vos filtres.',
  },
  reports: {
    icon: FileBarChart,
    emoji: '📊',
    defaultTitle: 'Aucun rapport disponible',
    defaultDesc: 'Générez votre premier rapport pour commencer.',
  },
  generic: {
    icon: MessageSquare,
    emoji: '📋',
    defaultTitle: 'Aucune donnée',
    defaultDesc: 'Il n\'y a rien à afficher pour le moment.',
  },
};

export function EmptyState({ type, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  const config = configs[type];

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)} role="status">
      <span className="text-5xl mb-4" aria-hidden="true">{config.emoji}</span>
      <h3 className="text-base font-display font-semibold mb-1">{title || config.defaultTitle}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description || config.defaultDesc}</p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
