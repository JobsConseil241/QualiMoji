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
import OpenQuestionsWizard from '@/components/kiosk/OpenQuestionsWizard';
import type { OpenAnswer, OpenQuestion } from '@/types/questionnaire';
import Screensaver from '@/components/kiosk/Screensaver';
import OfflineBadge from '@/components/kiosk/OfflineBadge';
import PageTransition from '@/components/kiosk/PageTransition';
import ThankYouScreen from '@/components/kiosk/ThankYouScreen';
import EmojiSelector from '@/components/kiosk/EmojiSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Step = 'sentiment' | 'followup' | 'open_wizard' | 'contact' | 'thankyou';

function KioskInner() {
  const { branchId } = useParams<{ branchId: string }>();
  const { config, loading, error, refetch } = useKioskConfig(branchId);
  const { isOnline, isSyncing, pendingCount, triggerSync } = useOnlineStatus();

  // Feedback flow state
  const [step, setStep] = useState<Step>('sentiment');
  const [selectedSentiment, setSelectedSentiment] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');
  const [contactLastName, setContactLastName] = useState('');
  const [contactFirstName, setContactFirstName] = useState('');
  const [contactGender, setContactGender] = useState<'M' | 'F' | null>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+241');
  const [submitting, setSubmitting] = useState(false);
  const [showScreensaver, setShowScreensaver] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [openAnswers, setOpenAnswers] = useState<OpenAnswer[] | null>(null);

  // Track previous step for direction
  const prevStepRef = useRef<Step>('sentiment');

  // Kiosk mode class on body + force light theme (no dark mode on public kiosk)
  useEffect(() => {
    document.body.classList.add('kiosk-mode');
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    root.classList.remove('dark');
    return () => {
      document.body.classList.remove('kiosk-mode');
      if (wasDark) root.classList.add('dark');
    };
  }, []);

  // Reset flow
  const resetFlow = useCallback(() => {
    setStep('sentiment');
    setSelectedSentiment(null);
    setSelectedOptions([]);
    setFreeText('');
    setOpenAnswers(null);
    setContactLastName('');
    setContactFirstName('');
    setContactGender(null);
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
    const order: Step[] = ['sentiment', 'followup', 'open_wizard', 'contact', 'thankyou'];
    const currentIdx = order.indexOf(step);
    const newIdx = order.indexOf(newStep);
    setDirection(newIdx >= currentIdx ? 'forward' : 'backward');
    prevStepRef.current = step;
    setStep(newStep);
  }, [step]);

  // Click-through guard: ignore sentiment clicks for a short window after screensaver dismissal
  const screensaverDismissedAtRef = useRef(0);

  // Handle sentiment selection
  const handleSentiment = (sentiment: string) => {
    if (Date.now() - screensaverDismissedAtRef.current < 300) {
      return;
    }
    setSelectedSentiment(sentiment);
    setSelectedOptions([]);
    setFreeText('');
    setOpenAnswers(null);
    const mode = (config as any)?.questionnaireMode ?? 'quadrimoji';
    goToStep(mode === 'open' ? 'open_wizard' : 'followup');
  };

  // Toggle option
  const toggleOption = (label: string) => {
    setSelectedOptions(prev => prev.includes(label) ? prev.filter(o => o !== label) : [...prev, label]);
  };

  // Track the saved feedback ID for contact update
  const [savedFeedbackId, setSavedFeedbackId] = useState<string | null>(null);

  // Submit feedback (saves to DB, then shows contact form)
  const handleSubmitFeedback = async (openAnswersOverride?: OpenAnswer[]) => {
    if (!branchId || !selectedSentiment) return;
    if (submitting) return;
    setSubmitting(true);

    const mode = (config as any)?.questionnaireMode ?? 'quadrimoji';
    const feedbackPayload = {
      branchId,
      sentiment: selectedSentiment,
      followUpResponses: mode === 'open'
        ? (openAnswersOverride ?? openAnswers)
        : {
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
    if (submitting) return;
    setSubmitting(true);
    const fullPhone = contactPhone
      ? (() => {
          // Nettoyer : enlever espaces, tirets, points
          const digits = contactPhone.replace(/[\s\-\.]/g, '');
          if (countryCode === '+241') {
            // Gabon:
            // - Ancien format: 0XXXXXXX (8 chiffres total avec le 0) → garder le 0 → +2410XXXXXXX
            // - Nouveau format: 0[67]XXXXXXXX (9 chiffres total avec le 0) → enlever le 0 → +241[67]XXXXXXXX
            if (digits.startsWith('0') && digits.length === 9) {
              // Nouveau format 9 chiffres: enlever le 0
              return `${countryCode}${digits.substring(1)}`;
            }
            // Ancien format 8 chiffres ou sans 0: garder tel quel
            return `${countryCode}${digits}`;
          }
          // Autres pays: enlever le 0 initial (convention internationale)
          return `${countryCode}${digits.replace(/^0+/, '')}`;
        })()
      : '';
    const fullName = [contactFirstName, contactLastName].filter(Boolean).join(' ');
    if (savedFeedbackId && isOnline && (fullName || contactEmail || fullPhone)) {
      try {
        const { default: api } = await import('@/lib/api');
        await api.put(`/kiosk/feedback/${savedFeedbackId}/contact`, {
          customer_name: fullName || null,
          customer_gender: contactGender,
          customer_email: contactEmail || null,
          customer_phone: fullPhone || null,
          wants_callback: true,
        });
      } catch {
        // Silent fail
      }
    }

    // WhatsApp notification is now handled server-side automatically

    setSubmitting(false);
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
          onDismiss={() => {
            screensaverDismissedAtRef.current = Date.now();
            setShowScreensaver(false);
          }}
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

          {step === 'open_wizard' && (() => {
            const DEFAULT_WIZARD_INTRO: Record<string, string> = {
              very_happy: 'Formidable ! 🎉 Votre satisfaction nous fait plaisir. Dites-nous ce qui a rendu votre visite exceptionnelle.',
              happy: 'Merci pour votre confiance. Vos réponses nous aident à maintenir ce niveau de service.',
              unhappy: "Nous regrettons que votre expérience n'ait pas été à la hauteur. Vos réponses nous aideront à progresser.",
              very_unhappy: "Nous sommes sincèrement désolés. Votre témoignage est précieux — prenons le temps d'écouter pour corriger ce qui doit l'être.",
            };
            const customMessages = ((config as any)?.wizardIntroMessages ?? {}) as Record<string, string>;
            const introMessage = selectedSentiment
              ? (customMessages[selectedSentiment]?.trim() || DEFAULT_WIZARD_INTRO[selectedSentiment])
              : undefined;
            return (
              <OpenQuestionsWizard
                questions={((config as any)?.openQuestions ?? []) as OpenQuestion[]}
                introMessage={introMessage}
                isSubmitting={submitting}
                onSubmit={(answers) => {
                  setOpenAnswers(answers);
                  handleSubmitFeedback(answers);
                }}
              />
            );
          })()}

          {step === 'contact' && (
            <div className="w-full max-w-md mx-auto text-center space-y-6">
              <div>
                <span className="text-5xl mb-3 block">✅</span>
                <h2 className="text-2xl font-display font-bold mb-1">Merci pour votre retour !</h2>
                <p className="text-sm text-muted-foreground">Souhaitez-vous être recontacté ? (optionnel)</p>
              </div>

              <div className="space-y-3 text-left">
                <div className="flex gap-2">
                  <Input value={contactLastName} onChange={e => setContactLastName(e.target.value)} placeholder="Nom" className="h-12 text-base flex-1" />
                  <Input value={contactFirstName} onChange={e => setContactFirstName(e.target.value)} placeholder="Prénom" className="h-12 text-base flex-1" />
                </div>

                {/* Genre */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setContactGender(contactGender === 'M' ? null : 'M')}
                    className={`flex-1 h-12 rounded-md border text-base font-medium transition-colors ${contactGender === 'M' ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background hover:bg-accent'}`}
                  >
                    Homme
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactGender(contactGender === 'F' ? null : 'F')}
                    className={`flex-1 h-12 rounded-md border text-base font-medium transition-colors ${contactGender === 'F' ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background hover:bg-accent'}`}
                  >
                    Femme
                  </button>
                </div>

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
                  <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Téléphone *" type="tel" className="h-12 text-base flex-1" />
                </div>
                <p className="kiosk-blink text-sm font-medium flex items-center gap-1.5" style={{ color: '#25D366' }}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="#25D366" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  Entrez votre numéro tel qu'il est sur WhatsApp pour recevoir le message.
                </p>
                {!contactPhone && <p className="text-xs text-destructive">* Le numéro de téléphone est obligatoire</p>}
              </div>

              <div className="flex flex-col items-center gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={() => { haptic(); handleSubmitContact(); }}
                  disabled={submitting || !contactPhone.trim()}
                  className="px-8 gap-2"
                >
                  {submitting ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Envoi…</>
                  ) : (
                    <><Phone className="h-5 w-5" /> Envoyer mes coordonnées</>
                  )}
                </Button>
                <button
                  onClick={() => { haptic(); goToStep('thankyou'); }}
                  disabled={submitting}
                  className="text-sm text-muted-foreground underline hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
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
