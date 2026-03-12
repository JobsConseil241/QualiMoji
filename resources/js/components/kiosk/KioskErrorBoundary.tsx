import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  autoRetryTimer: ReturnType<typeof setTimeout> | null;
}

const MAX_RETRIES = 3;
const RETRY_INTERVAL = 10_000;

export class KioskErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0, autoRetryTimer: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[KioskErrorBoundary]', error, info);
    this.scheduleAutoRetry();
  }

  componentWillUnmount() {
    if (this.state.autoRetryTimer) clearTimeout(this.state.autoRetryTimer);
  }

  scheduleAutoRetry = () => {
    if (this.state.retryCount >= MAX_RETRIES) return;
    const timer = setTimeout(() => {
      this.handleRetry();
    }, RETRY_INTERVAL);
    this.setState({ autoRetryTimer: timer });
  };

  handleRetry = () => {
    if (this.state.autoRetryTimer) clearTimeout(this.state.autoRetryTimer);
    this.setState(prev => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
      autoRetryTimer: null,
    }));
  };

  render() {
    if (this.state.hasError) {
      const { retryCount } = this.state;
      const canAutoRetry = retryCount < MAX_RETRIES;

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center">
          <div className="p-5 rounded-full bg-destructive/10 mb-6">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-2">Service temporairement indisponible</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            {this.state.error?.message || 'Une erreur inattendue est survenue.'}
          </p>
          {canAutoRetry && (
            <p className="text-sm text-muted-foreground mb-4">
              Nouvelle tentative dans quelques secondes… ({retryCount}/{MAX_RETRIES})
            </p>
          )}
          <Button onClick={this.handleRetry} size="lg" className="gap-2">
            <RefreshCw className="h-5 w-5" />
            Réessayer
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
