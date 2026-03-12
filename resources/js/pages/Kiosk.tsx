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
  const [countryCode, setCountryCode] = useState('+33');
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
    setCountryCode('+33');
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
    const fullPhone = contactPhone ? `${countryCode}${contactPhone.replace(/^0+/, '')}` : '';
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
                    <optgroup label="Fréquents">
                      <option value="+33">🇫🇷 +33 France</option>
                      <option value="+212">🇲🇦 +212 Maroc</option>
                      <option value="+32">🇧🇪 +32 Belgique</option>
                      <option value="+41">🇨🇭 +41 Suisse</option>
                      <option value="+1">🇺🇸 +1 USA/Canada</option>
                      <option value="+44">🇬🇧 +44 Royaume-Uni</option>
                    </optgroup>
                    <optgroup label="Europe">
                      <option value="+355">🇦🇱 +355 Albanie</option>
                      <option value="+49">🇩🇪 +49 Allemagne</option>
                      <option value="+376">🇦🇩 +376 Andorre</option>
                      <option value="+43">🇦🇹 +43 Autriche</option>
                      <option value="+375">🇧🇾 +375 Biélorussie</option>
                      <option value="+387">🇧🇦 +387 Bosnie</option>
                      <option value="+359">🇧🇬 +359 Bulgarie</option>
                      <option value="+357">🇨🇾 +357 Chypre</option>
                      <option value="+385">🇭🇷 +385 Croatie</option>
                      <option value="+45">🇩🇰 +45 Danemark</option>
                      <option value="+34">🇪🇸 +34 Espagne</option>
                      <option value="+372">🇪🇪 +372 Estonie</option>
                      <option value="+358">🇫🇮 +358 Finlande</option>
                      <option value="+30">🇬🇷 +30 Grèce</option>
                      <option value="+36">🇭🇺 +36 Hongrie</option>
                      <option value="+353">🇮🇪 +353 Irlande</option>
                      <option value="+354">🇮🇸 +354 Islande</option>
                      <option value="+39">🇮🇹 +39 Italie</option>
                      <option value="+371">🇱🇻 +371 Lettonie</option>
                      <option value="+370">🇱🇹 +370 Lituanie</option>
                      <option value="+352">🇱🇺 +352 Luxembourg</option>
                      <option value="+389">🇲🇰 +389 Macédoine</option>
                      <option value="+356">🇲🇹 +356 Malte</option>
                      <option value="+373">🇲🇩 +373 Moldavie</option>
                      <option value="+377">🇲🇨 +377 Monaco</option>
                      <option value="+382">🇲🇪 +382 Monténégro</option>
                      <option value="+47">🇳🇴 +47 Norvège</option>
                      <option value="+31">🇳🇱 +31 Pays-Bas</option>
                      <option value="+48">🇵🇱 +48 Pologne</option>
                      <option value="+351">🇵🇹 +351 Portugal</option>
                      <option value="+420">🇨🇿 +420 Tchéquie</option>
                      <option value="+40">🇷🇴 +40 Roumanie</option>
                      <option value="+7">🇷🇺 +7 Russie</option>
                      <option value="+381">🇷🇸 +381 Serbie</option>
                      <option value="+421">🇸🇰 +421 Slovaquie</option>
                      <option value="+386">🇸🇮 +386 Slovénie</option>
                      <option value="+46">🇸🇪 +46 Suède</option>
                      <option value="+380">🇺🇦 +380 Ukraine</option>
                    </optgroup>
                    <optgroup label="Afrique">
                      <option value="+27">🇿🇦 +27 Afrique du Sud</option>
                      <option value="+213">🇩🇿 +213 Algérie</option>
                      <option value="+244">🇦🇴 +244 Angola</option>
                      <option value="+229">🇧🇯 +229 Bénin</option>
                      <option value="+226">🇧🇫 +226 Burkina Faso</option>
                      <option value="+257">🇧🇮 +257 Burundi</option>
                      <option value="+237">🇨🇲 +237 Cameroun</option>
                      <option value="+238">🇨🇻 +238 Cap-Vert</option>
                      <option value="+236">🇨🇫 +236 Centrafrique</option>
                      <option value="+269">🇰🇲 +269 Comores</option>
                      <option value="+242">🇨🇬 +242 Congo</option>
                      <option value="+243">🇨🇩 +243 RD Congo</option>
                      <option value="+225">🇨🇮 +225 Côte d'Ivoire</option>
                      <option value="+253">🇩🇯 +253 Djibouti</option>
                      <option value="+20">🇪🇬 +20 Égypte</option>
                      <option value="+291">🇪🇷 +291 Érythrée</option>
                      <option value="+251">🇪🇹 +251 Éthiopie</option>
                      <option value="+241">🇬🇦 +241 Gabon</option>
                      <option value="+220">🇬🇲 +220 Gambie</option>
                      <option value="+233">🇬🇭 +233 Ghana</option>
                      <option value="+224">🇬🇳 +224 Guinée</option>
                      <option value="+245">🇬🇼 +245 Guinée-Bissau</option>
                      <option value="+240">🇬🇶 +240 Guinée équat.</option>
                      <option value="+254">🇰🇪 +254 Kenya</option>
                      <option value="+231">🇱🇷 +231 Liberia</option>
                      <option value="+218">🇱🇾 +218 Libye</option>
                      <option value="+261">🇲🇬 +261 Madagascar</option>
                      <option value="+265">🇲🇼 +265 Malawi</option>
                      <option value="+223">🇲🇱 +223 Mali</option>
                      <option value="+230">🇲🇺 +230 Maurice</option>
                      <option value="+222">🇲🇷 +222 Mauritanie</option>
                      <option value="+258">🇲🇿 +258 Mozambique</option>
                      <option value="+264">🇳🇦 +264 Namibie</option>
                      <option value="+227">🇳🇪 +227 Niger</option>
                      <option value="+234">🇳🇬 +234 Nigeria</option>
                      <option value="+256">🇺🇬 +256 Ouganda</option>
                      <option value="+250">🇷🇼 +250 Rwanda</option>
                      <option value="+221">🇸🇳 +221 Sénégal</option>
                      <option value="+232">🇸🇱 +232 Sierra Leone</option>
                      <option value="+252">🇸🇴 +252 Somalie</option>
                      <option value="+249">🇸🇩 +249 Soudan</option>
                      <option value="+255">🇹🇿 +255 Tanzanie</option>
                      <option value="+235">🇹🇩 +235 Tchad</option>
                      <option value="+228">🇹🇬 +228 Togo</option>
                      <option value="+216">🇹🇳 +216 Tunisie</option>
                      <option value="+260">🇿🇲 +260 Zambie</option>
                      <option value="+263">🇿🇼 +263 Zimbabwe</option>
                    </optgroup>
                    <optgroup label="Moyen-Orient">
                      <option value="+966">🇸🇦 +966 Arabie saoudite</option>
                      <option value="+973">🇧🇭 +973 Bahreïn</option>
                      <option value="+971">🇦🇪 +971 Émirats arabes</option>
                      <option value="+964">🇮🇶 +964 Irak</option>
                      <option value="+98">🇮🇷 +98 Iran</option>
                      <option value="+972">🇮🇱 +972 Israël</option>
                      <option value="+962">🇯🇴 +962 Jordanie</option>
                      <option value="+965">🇰🇼 +965 Koweït</option>
                      <option value="+961">🇱🇧 +961 Liban</option>
                      <option value="+968">🇴🇲 +968 Oman</option>
                      <option value="+970">🇵🇸 +970 Palestine</option>
                      <option value="+974">🇶🇦 +974 Qatar</option>
                      <option value="+963">🇸🇾 +963 Syrie</option>
                      <option value="+90">🇹🇷 +90 Turquie</option>
                      <option value="+967">🇾🇪 +967 Yémen</option>
                    </optgroup>
                    <optgroup label="Asie & Océanie">
                      <option value="+93">🇦🇫 +93 Afghanistan</option>
                      <option value="+61">🇦🇺 +61 Australie</option>
                      <option value="+880">🇧🇩 +880 Bangladesh</option>
                      <option value="+855">🇰🇭 +855 Cambodge</option>
                      <option value="+86">🇨🇳 +86 Chine</option>
                      <option value="+82">🇰🇷 +82 Corée du Sud</option>
                      <option value="+852">🇭🇰 +852 Hong Kong</option>
                      <option value="+91">🇮🇳 +91 Inde</option>
                      <option value="+62">🇮🇩 +62 Indonésie</option>
                      <option value="+81">🇯🇵 +81 Japon</option>
                      <option value="+60">🇲🇾 +60 Malaisie</option>
                      <option value="+64">🇳🇿 +64 Nouvelle-Zélande</option>
                      <option value="+92">🇵🇰 +92 Pakistan</option>
                      <option value="+63">🇵🇭 +63 Philippines</option>
                      <option value="+65">🇸🇬 +65 Singapour</option>
                      <option value="+94">🇱🇰 +94 Sri Lanka</option>
                      <option value="+66">🇹🇭 +66 Thaïlande</option>
                      <option value="+84">🇻🇳 +84 Vietnam</option>
                    </optgroup>
                    <optgroup label="Amériques">
                      <option value="+54">🇦🇷 +54 Argentine</option>
                      <option value="+55">🇧🇷 +55 Brésil</option>
                      <option value="+56">🇨🇱 +56 Chili</option>
                      <option value="+57">🇨🇴 +57 Colombie</option>
                      <option value="+506">🇨🇷 +506 Costa Rica</option>
                      <option value="+53">🇨🇺 +53 Cuba</option>
                      <option value="+593">🇪🇨 +593 Équateur</option>
                      <option value="+509">🇭🇹 +509 Haïti</option>
                      <option value="+52">🇲🇽 +52 Mexique</option>
                      <option value="+507">🇵🇦 +507 Panama</option>
                      <option value="+595">🇵🇾 +595 Paraguay</option>
                      <option value="+51">🇵🇪 +51 Pérou</option>
                      <option value="+1809">🇩🇴 +1809 Rép. dominicaine</option>
                      <option value="+598">🇺🇾 +598 Uruguay</option>
                      <option value="+58">🇻🇪 +58 Venezuela</option>
                    </optgroup>
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
