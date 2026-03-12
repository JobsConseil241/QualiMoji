import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, RefreshCw } from 'lucide-react';

export default function ServerError() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <span className="text-6xl mb-6 block" aria-hidden="true">⚠️</span>
        <h1 className="text-4xl font-display font-bold mb-2">500</h1>
        <p className="text-lg text-muted-foreground mb-2">Erreur interne du serveur</p>
        <p className="text-sm text-muted-foreground mb-6">
          Quelque chose s'est mal passé de notre côté. Veuillez réessayer dans quelques instants.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" className="gap-2" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            Réessayer
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
