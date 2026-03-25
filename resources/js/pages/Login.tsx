import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [branding, setBranding] = useState<{ name: string; logo_url: string | null }>({ name: '', logo_url: null });
  const { login, resetPassword, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    api.get('/branding').then(({ data }) => setBranding(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur de connexion',
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await resetPassword(forgotEmail);
      toast({
        title: 'Email envoyé',
        description: 'Vérifiez votre boîte de réception pour réinitialiser votre mot de passe.',
      });
      setShowForgot(false);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md glass-card shadow-xl">
        <CardHeader className="text-center pb-2 pt-8">
          {branding.logo_url ? (
            <img
              src={branding.logo_url}
              alt={branding.name}
              className="mx-auto mb-4 h-16 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
          )}
          <h1 className="font-display text-2xl font-bold tracking-tight">{branding.name || 'QualiMoji'}</h1>
          <p className="text-sm text-muted-foreground mt-1">Plateforme Qualité & Satisfaction Client</p>
        </CardHeader>
        <CardContent className="p-6 pt-4">
          {!showForgot ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.fr"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                      Se souvenir de moi
                    </Label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Se connecter
                </Button>
              </form>

              {/* Demo accounts */}
              <div className="mt-6 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground text-center mb-3 font-medium uppercase tracking-wide">Comptes de démonstration</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Administrateur', desc: 'Accès complet', email: 'admin@bgfi.com' },
                    { label: 'Directeur Qualité', desc: 'Dashboard, rapports, KPIs', email: 'sophie.nze@bgfi.com' },
                    { label: 'Directeur de Zone', desc: 'Zone Libreville (4 agences)', email: 'marc.ndong@bgfi.com' },
                    { label: "Directeur d'Agence", desc: 'BGFI Siège Central', email: 'jm.obiang@bgfi.com' },
                    { label: "Directeur d'Agence", desc: 'Centauri Premium Libreville', email: 'c.moussavou@bgfi.com' },
                    { label: 'Admin IT', desc: 'Gestion technique', email: 'p.ntoutoume@bgfi.com' },
                  ].map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => { setEmail(account.email); setPassword('password'); }}
                      className="w-full flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-left text-xs hover:bg-accent/50 transition-colors group"
                    >
                      <div>
                        <span className="font-medium text-foreground">{account.label}</span>
                        <span className="text-muted-foreground ml-1.5">— {account.desc}</span>
                      </div>
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors">{account.email}</span>
                    </button>
                  ))}
                  <p className="text-[10px] text-muted-foreground text-center mt-2">
                    Mot de passe : <code className="bg-muted px-1 py-0.5 rounded">password</code>
                  </p>
                </div>
              </div>
            </>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Entrez votre email pour recevoir un lien de réinitialisation.
              </p>
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="votre@email.fr"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Envoyer le lien
              </Button>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Retour à la connexion
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
