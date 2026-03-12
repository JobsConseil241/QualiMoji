import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <span className="text-6xl mb-6 block" aria-hidden="true">🔍</span>
        <h1 className="text-4xl font-display font-bold mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-2">Page introuvable</p>
        <p className="text-sm text-muted-foreground mb-6">
          La page <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{location.pathname}</code> n'existe pas ou a été déplacée.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" className="gap-2" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <Button className="gap-2" onClick={() => window.location.href = '/'}>
            <Home className="h-4 w-4" />
            Accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
