import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, RefreshCw, Phone } from 'lucide-react';
import { submitKioskFeedback, type KioskQuestion } from '@/services/kioskService';
import { queueFeedback } from '@/services/offlineStore';
import { useKioskConfig } from '@/hooks/useKioskConfig';
import { useInactivity } from '@/hooks/useInactivity';
import { useAutoReset } from '@/hooks/useAutoReset';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { KioskErrorBoundary } from '@/components/kiosk/KioskErrorBoundary';
import Screensaver from '@/components/kiosk/Screensaver';
import OfflineBadge from '@/components/kiosk/OfflineBadge';
import PageTransition from '@/components/kiosk/PageTransition';
import ThankYouScreen from '@/components/kiosk/ThankYouScreen';
import EmojiSelector from '@/components/kiosk/EmojiSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Step = 'sentiment' | 'followup' | 'contact' | 'thankyou';

function KioskInner() {
  const { branchId } = useParams<{ branchId: string }>();
  const { config, loading, error, refetch } = useKioskConfig(branchId);
  const { isOnline, isSyncing, pendingCount, triggerSync } = useOnlineStatus();

  // Feedback flow state
  const [step, setStep] = useState<Step>('sentiment');
  const [selectedSentiment, setSelectedSentiment] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+241');
  const [submitting, setSubmitting] = useState(false);
  const [showScreensaver, setShowScreensaver] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  // Track previous step for direction
  const prevStepRef = useRef<Step>('sentiment');

  // Kiosk mode class on body
  useEffect(() => {
    document.body.classList.add('kiosk-mode');
    return () => document.body.classList.remove('kiosk-mode');
  }, []);

  // Reset flow
  const resetFlow = useCallback(() => {
    setStep('sentiment');
    setSelectedSentiment(null);
    setSelectedOptions([]);
    setFreeText('');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setCountryCode('+241');
    setSavedFeedbackId(null);
    setDirection('forward');
  }, []);

  // Screensaver inactivity (only on sentiment step)
  useInactivity({
    timeout: config?.screensaverDelay ?? 60,
    onInactive: () => setShowScreensaver(true),
    onActive: () => setShowScreensaver(false),
    enabled: config?.screensaverEnabled !== false && step === 'sentiment',
  });

  // Auto-reset inactivity (on other steps, go back to sentiment)
  useInactivity({
    timeout: config?.inactivityTimeout ?? 30,
    onInactive: resetFlow,
    enabled: step !== 'sentiment' && step !== 'thankyou',
  });

  // Auto-reset delay
  const autoResetSeconds = config?.autoResetDelay ?? 8;

  // Get current question config
  const currentQuestion: KioskQuestion | undefined = config?.questions.find(q => q.sentiment === selectedSentiment);

  // Navigate steps with direction tracking
  const goToStep = useCallback((newStep: Step) => {
    const order: Step[] = ['sentiment', 'followup', 'contact', 'thankyou'];
    const currentIdx = order.indexOf(step);
    const newIdx = order.indexOf(newStep);
    setDirection(newIdx >= currentIdx ? 'forward' : 'backward');
    prevStepRef.current = step;
    setStep(newStep);
  }, [step]);

  // Handle sentiment selection
  const handleSentiment = (sentiment: string) => {
    setSelectedSentiment(sentiment);
    setSelectedOptions([]);
    setFreeText('');
    goToStep('followup');
  };

  // Toggle option
  const toggleOption = (label: string) => {
    setSelectedOptions(prev => prev.includes(label) ? prev.filter(o => o !== label) : [...prev, label]);
  };

  // Track the saved feedback ID for contact update
  const [savedFeedbackId, setSavedFeedbackId] = useState<string | null>(null);

  // Submit feedback (saves to DB, then shows contact form)
  const handleSubmitFeedback = async () => {
    if (!branchId || !selectedSentiment) return;
    setSubmitting(true);

    const feedbackPayload = {
      branchId,
      sentiment: selectedSentiment,
      followUpResponses: {
        question: currentQuestion?.question,
        selectedOptions,
        freeText: freeText || undefined,
      },
      wantsCallback: false,
    };

    try {
      let result: any;
      if (isOnline) {
        result = await submitKioskFeedback(feedbackPayload);
      } else {
        await queueFeedback(feedbackPayload);
      }
      if (result?.id) setSavedFeedbackId(result.id);
    } catch {
      try {
        await queueFeedback(feedbackPayload);
      } catch {
        // Silent fail
      }
    } finally {
      setSubmitting(false);
      goToStep('contact');
    }
  };

  // Submit contact info (optional, updates existing feedback via API)
  const handleSubmitContact = async () => {
    const fullPhone = contactPhone
      ? (() => {
          const digits = contactPhone.replace(/\s+/g, '');
          if (countryCode === '+241') {
            // Gabon: 8 chiffres (ancien format 0XXXXXXX) → garder le 0
            // 9 chiffres (nouveau format 0[67]XXXXXXX) → enlever le 0
            const cleaned = digits.replace(/^0/, '');
            return cleaned.length >= 8
              ? `${countryCode}${cleaned}`
              : `${countryCode}${digits}`;
          }
          return `${countryCode}${digits.replace(/^0+/, '')}`;
        })()
      : '';
    if (savedFeedbackId && isOnline && (contactName || contactEmail || fullPhone)) {
      try {
        const { default: api } = await import('@/lib/api');
        await api.put(`/kiosk/feedback/${savedFeedbackId}/contact`, {
          customer_name: contactName || null,
          customer_email: contactEmail || null,
          customer_phone: fullPhone || null,
          wants_callback: true,
        });
      } catch {
        // Silent fail
      }
    }

    // WhatsApp notification is now handled server-side automatically

    goToStep('thankyou');
  };

  // Haptic feedback helper
  const haptic = useCallback(() => {
    if (config?.hapticEnabled !== false && navigator.vibrate) {
      navigator.vibrate(15);
    }
  }, [config?.hapticEnabled]);

  // No branchId → kiosk not configured
  if (!branchId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center">
        <span className="text-6xl mb-4">📱</span>
        <h1 className="text-2xl font-display font-bold mb-2">Kiosk non configuré</h1>
        <p className="text-muted-foreground">Veuillez scanner le QR code de votre agence</p>
      </div>
    );
  }

  if (loading && !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center">
        <span className="text-6xl mb-4">⚠️</span>
        <h1 className="text-2xl font-display font-bold mb-2">Kiosk indisponible</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={refetch} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Réessayer
        </Button>
      </div>
    );
  }

  if (!config) return null;

  const { branding } = config;

  return (
    <div className="kiosk-container">
      {/* Screensaver */}
      {showScreensaver && (
        <Screensaver
          slides={config.screensaverSlides}
          primaryColor={branding.primaryColor}
          onDismiss={() => setShowScreensaver(false)}
        />
      )}

      {/* Offline badge */}
      <OfflineBadge pendingCount={pendingCount} isSyncing={isSyncing} />

      {/* Header */}
      <header className="py-10 flex px-6 bg-background">
        <div className={cn(
          'flex flex-col gap-3 w-full',
          branding.logoPosition === 'left' ? 'items-start' : branding.logoPosition === 'right' ? 'items-end' : 'items-center'
        )}>
          {branding.logoUrl && (
            <img
              src={branding.logoUrl}
              alt=""
              className="object-contain"
              style={{ height: branding.logoSize === 'small' ? 40 : branding.logoSize === 'large' ? 96 : 64 }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className={cn(
            branding.logoPosition === 'left' ? 'text-left' : branding.logoPosition === 'right' ? 'text-right' : 'text-center'
          )}>
            {branding.showOrgName && <h1 className="text-xl font-display font-bold text-foreground">{branding.orgName}</h1>}
            {branding.showBranchName && <p className="text-sm text-muted-foreground">{config.branchName}</p>}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6 bg-background overflow-hidden">
        <PageTransition stepKey={step} direction={direction}>
          {step === 'sentiment' && (
            <div className="w-full text-center space-y-10 px-10">
              <div>
                <h2 className="text-4xl font-display font-bold mb-3">
                  {config.welcomeMessage || 'Comment évaluez-vous votre expérience ?'}
                </h2>
                <p className="text-xl text-muted-foreground">Appuyez sur un smiley pour donner votre avis</p>
              </div>
              <EmojiSelector
                questions={config.questions}
                onSelect={handleSentiment}
                haptic={haptic}
              />
            </div>
          )}

          {step === 'followup' && (
            <div className="w-full max-w-xl mx-auto text-center space-y-6">
              {currentQuestion ? (
                <>
                  <div>
                    <span className="text-5xl mb-3 block">{currentQuestion.emoji}</span>
                    <h2 className="text-2xl font-display font-bold mb-1">{currentQuestion.question}</h2>
                    <p className="text-sm text-muted-foreground">Sélectionnez une ou plusieurs réponses</p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-3">
                    {currentQuestion.options.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { haptic(); toggleOption(opt.label); }}
                        className={cn(
                          'kiosk-option-chip',
                          selectedOptions.includes(opt.label)
                            ? 'kiosk-option-chip--selected'
                            : 'kiosk-option-chip--unselected'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {currentQuestion.allowFreeText && (
                    <Textarea
                      value={freeText}
                      onChange={e => setFreeText(e.target.value)}
                      placeholder="Autre commentaire (optionnel)…"
                      className="text-base resize-none"
                      rows={3}
                    />
                  )}
                </>
              ) : (
                <div>
                  <h2 className="text-2xl font-display font-bold mb-1">Merci pour votre retour !</h2>
                  <p className="text-sm text-muted-foreground">Souhaitez-vous ajouter un commentaire ?</p>
                  <Textarea
                    value={freeText}
                    onChange={e => setFreeText(e.target.value)}
                    placeholder="Votre commentaire (optionnel)…"
                    className="text-base resize-none mt-4"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex flex-col items-center gap-3 pt-2">
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" size="lg" onClick={() => { haptic(); goToStep('sentiment'); }}>
                    ← Retour
                  </Button>
                  <Button size="lg" onClick={() => { haptic(); handleSubmitFeedback(); }} disabled={submitting} className="px-8">
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Envoyer ✓'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 'contact' && (
            <div className="w-full max-w-md mx-auto text-center space-y-6">
              <div>
                <span className="text-5xl mb-3 block">✅</span>
                <h2 className="text-2xl font-display font-bold mb-1">Merci pour votre retour !</h2>
                <p className="text-sm text-muted-foreground">Souhaitez-vous être recontacté ? (optionnel)</p>
              </div>

              <div className="space-y-3 text-left">
                <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Nom (optionnel)" className="h-12 text-base" />
                <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Email (optionnel)" type="email" className="h-12 text-base" />
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={e => setCountryCode(e.target.value)}
                    className="h-12 rounded-md border border-input bg-background px-2 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                      <option value="+241">🇬🇦 +241 Gabon</option>
                      <option value="+33">🇫🇷 +33 France</option>
                      <option value="+237">🇨🇲 +237 Cameroun</option>
                      <option value="+228">🇹🇬 +228 Togo</option>
                      <option value="+229">🇧🇯 +229 Bénin</option>
                      <option value="+242">🇨🇬 +242 Congo</option>
                      <option value="+225">🇨🇮 +225 Côte d'Ivoire</option>
                  </select>
                  <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Téléphone (optionnel)" type="tel" className="h-12 text-base flex-1" />
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 pt-2">
                <Button size="lg" onClick={() => { haptic(); handleSubmitContact(); }} className="px-8 gap-2">
                  <Phone className="h-5 w-5" /> Envoyer mes coordonnées
                </Button>
                <button onClick={() => { haptic(); goToStep('thankyou'); }} className="text-sm text-muted-foreground underline hover:text-foreground">
                  Non merci, terminer
                </button>
              </div>
            </div>
          )}

          {step === 'thankyou' && selectedSentiment && (
            <ThankYouScreen
              sentiment={selectedSentiment}
              autoResetDelay={autoResetSeconds}
              onReset={resetFlow}
            />
          )}
        </PageTransition>
      </main>

      {/* Footer */}
      <footer className="h-12 flex items-center justify-center text-xs text-muted-foreground bg-muted/30 border-t">
        {config.footerText || 'Propulsé par QualityHub'}
      </footer>
    </div>
  );
}

export default function Kiosk() {
  return (
    <KioskErrorBoundary>
      <KioskInner />
    </KioskErrorBoundary>
  );
}
