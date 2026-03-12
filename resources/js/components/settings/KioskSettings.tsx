import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Plus, Trash2, GripVertical, Monitor, Volume2, Vibrate, Wifi, Image, Clock, Type, Upload, Link as LinkIcon } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { fetchBranches, type DbBranch } from '@/services/dataService';
import {
  getGlobalKioskConfig,
  getBranchKioskConfig,
  saveGlobalKioskConfig,
  saveBranchKioskConfig,
  type KioskConfigData,
  type ScreensaverSlide,
} from '@/services/kioskConfigService';


const DEFAULTS: KioskConfigData = {
  id: '',
  branchId: null,
  organizationId: null,
  welcomeMessage: 'Comment s\'est passée votre expérience aujourd\'hui ?',
  startButtonText: 'Donner mon avis',
  inactivityTimeout: 30,
  screensaverDelay: 60,
  autoResetDelay: 10,
  screensaverEnabled: true,
  soundsEnabled: false,
  hapticEnabled: true,
  offlineModeEnabled: true,
  screensaverSlides: [],
  footerText: 'Propulsé par QualityHub',
};

export default function KioskSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<KioskConfigData>(DEFAULTS);
  const [branches, setBranches] = useState<DbBranch[]>([]);
  const [perBranch, setPerBranch] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [branchConfig, setBranchConfig] = useState<KioskConfigData | null>(null);

  // Load global config + branches
  useEffect(() => {
    (async () => {
      try {
        const [globalCfg, branchList] = await Promise.all([
          getGlobalKioskConfig(),
          fetchBranches(),
        ]);
        if (globalCfg) setConfig({
          ...DEFAULTS,
          ...globalCfg,
          // Map snake_case from API to camelCase
          welcomeMessage: globalCfg.welcomeMessage ?? globalCfg.welcome_message ?? DEFAULTS.welcomeMessage,
          startButtonText: globalCfg.startButtonText ?? globalCfg.start_button_text ?? DEFAULTS.startButtonText,
          inactivityTimeout: globalCfg.inactivityTimeout ?? globalCfg.inactivity_timeout ?? DEFAULTS.inactivityTimeout,
          screensaverDelay: globalCfg.screensaverDelay ?? globalCfg.screensaver_delay ?? DEFAULTS.screensaverDelay,
          autoResetDelay: globalCfg.autoResetDelay ?? globalCfg.auto_reset_delay ?? DEFAULTS.autoResetDelay,
          screensaverEnabled: globalCfg.screensaverEnabled ?? globalCfg.screensaver_enabled ?? DEFAULTS.screensaverEnabled,
          soundsEnabled: globalCfg.soundsEnabled ?? globalCfg.sounds_enabled ?? DEFAULTS.soundsEnabled,
          hapticEnabled: globalCfg.hapticEnabled ?? globalCfg.haptic_enabled ?? DEFAULTS.hapticEnabled,
          offlineModeEnabled: globalCfg.offlineModeEnabled ?? globalCfg.offline_mode_enabled ?? DEFAULTS.offlineModeEnabled,
          screensaverSlides: globalCfg.screensaverSlides ?? globalCfg.screensaver_slides ?? DEFAULTS.screensaverSlides,
          footerText: globalCfg.footerText ?? globalCfg.footer_text ?? DEFAULTS.footerText,
        });
        setBranches(branchList);
      } catch (err: any) {
        toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  // Load branch config when selected
  useEffect(() => {
    if (!selectedBranch || !perBranch) { setBranchConfig(null); return; }
    (async () => {
      const cfg = await getBranchKioskConfig(selectedBranch);
      setBranchConfig(cfg || { ...config, branchId: selectedBranch });
    })();
  }, [selectedBranch, perBranch]);

  const activeConfig = perBranch && branchConfig ? branchConfig : config;
  const setActiveConfig = perBranch && branchConfig
    ? (updater: (prev: KioskConfigData) => KioskConfigData) => setBranchConfig(updater)
    : (updater: (prev: KioskConfigData) => KioskConfigData) => setConfig(updater);

  const update = useCallback((field: keyof KioskConfigData, value: any) => {
    setActiveConfig((prev: any) => ({ ...prev, [field]: value }));
  }, [perBranch, branchConfig]);

  const ACCEPTED_FORMATS = '.jpg,.jpeg,.png,.webp';
  const MAX_FILE_SIZE_MB = 5;
  const RECOMMENDED_DIMENSIONS = '1920 × 1080 px (16:9)';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Slides management
  const addSlide = () => {
    const slide: ScreensaverSlide = {
      id: crypto.randomUUID(),
      imageUrl: '',
      title: '',
      subtitle: '',
      order: activeConfig.screensaverSlides.length,
    };
    update('screensaverSlides', [...activeConfig.screensaverSlides, slide]);
  };

  const handleFileUpload = async (slideId: string, file: File) => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({ title: 'Fichier trop volumineux', description: `Taille max : ${MAX_FILE_SIZE_MB} Mo`, variant: 'destructive' });
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      toast({ title: 'Format non supporté', description: 'Formats acceptés : JPG, PNG, WebP', variant: 'destructive' });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/settings/kiosk/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = data.url;
      updateSlide(slideId, 'imageUrl', url);
      toast({ title: 'Image uploadée' });
    } catch (err: any) {
      toast({ title: 'Erreur upload', description: err.response?.data?.message || err.message, variant: 'destructive' });
    }
  };

  const updateSlide = (id: string, field: keyof ScreensaverSlide, value: any) => {
    update('screensaverSlides', activeConfig.screensaverSlides.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSlide = (id: string) => {
    update('screensaverSlides', activeConfig.screensaverSlides.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })));
  };

  // Save
  const handleSave = async () => {
    setSaving(true);
    try {
      if (perBranch && selectedBranch && branchConfig) {
        await saveBranchKioskConfig(selectedBranch, branchConfig);
      } else {
        await saveGlobalKioskConfig(config);
      }
      toast({ title: 'Configuration Kiosk enregistrée', description: 'Les paramètres ont été sauvegardés.' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Comportement */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Clock className="h-4 w-4" /> Comportement du Kiosk
          </CardTitle>
          <CardDescription className="text-xs">Délais et fonctionnalités du kiosque</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Screensaver delay */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Délai screensaver</Label>
              <span className="text-sm font-display font-bold">{activeConfig.screensaverDelay}s</span>
            </div>
            <Slider
              value={[activeConfig.screensaverDelay]}
              onValueChange={([v]) => update('screensaverDelay', v)}
              min={30} max={300} step={10}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>30s</span><span>300s</span>
            </div>
          </div>

          {/* Auto-reset delay */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Délai auto-reset après feedback</Label>
              <span className="text-sm font-display font-bold">{activeConfig.autoResetDelay}s</span>
            </div>
            <Slider
              value={[activeConfig.autoResetDelay]}
              onValueChange={([v]) => update('autoResetDelay', v)}
              min={5} max={30} step={1}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>5s</span><span>30s</span>
            </div>
          </div>

          {/* Inactivity timeout */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Délai inactivité → retour accueil</Label>
              <span className="text-sm font-display font-bold">{activeConfig.inactivityTimeout}s</span>
            </div>
            <Slider
              value={[activeConfig.inactivityTimeout]}
              onValueChange={([v]) => update('inactivityTimeout', v)}
              min={15} max={120} step={5}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>15s</span><span>120s</span>
            </div>
          </div>

          <Separator />

          {/* Toggles */}
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2"><Monitor className="h-3.5 w-3.5" /> Screensaver activé</Label>
              <Switch checked={activeConfig.screensaverEnabled} onCheckedChange={v => update('screensaverEnabled', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2"><Volume2 className="h-3.5 w-3.5" /> Sons activés</Label>
              <Switch checked={activeConfig.soundsEnabled} onCheckedChange={v => update('soundsEnabled', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2"><Vibrate className="h-3.5 w-3.5" /> Retour haptique</Label>
              <Switch checked={activeConfig.hapticEnabled} onCheckedChange={v => update('hapticEnabled', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2"><Wifi className="h-3.5 w-3.5" /> Mode offline</Label>
              <Switch checked={activeConfig.offlineModeEnabled} onCheckedChange={v => update('offlineModeEnabled', v)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Screensaver Slides */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Image className="h-4 w-4" /> Slides du Screensaver
              </CardTitle>
              <CardDescription className="text-xs">Images affichées quand le kiosque est inactif</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addSlide} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
            <p>Dimensions recommandées : <strong>{RECOMMENDED_DIMENSIONS}</strong></p>
            <p>Formats acceptés : <strong>JPG, PNG, WebP</strong> — Max <strong>{MAX_FILE_SIZE_MB} Mo</strong> par image</p>
          </div>

          {activeConfig.screensaverSlides.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucune slide configurée. Le screensaver affichera le logo de l'organisation.
            </p>
          ) : (
            activeConfig.screensaverSlides
              .sort((a, b) => a.order - b.order)
              .map((slide, idx) => (
                <div key={slide.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <div className="flex items-center text-muted-foreground pt-2">
                    <GripVertical className="h-4 w-4" />
                    <span className="text-xs font-mono ml-1">{idx + 1}</span>
                  </div>
                  <div className="flex-1 space-y-2">
                    {/* Image preview */}
                    {slide.imageUrl && (
                      <div className="relative w-full h-24 rounded-md overflow-hidden bg-muted">
                        <img
                          src={slide.imageUrl}
                          alt={slide.title || `Slide ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                    {/* Upload or URL */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="relative">
                          <LinkIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <Input
                            value={slide.imageUrl}
                            onChange={e => updateSlide(slide.id, 'imageUrl', e.target.value)}
                            placeholder="URL de l'image ou uploadez un fichier"
                            className="h-8 text-xs pl-7"
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 text-xs shrink-0"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = ACCEPTED_FORMATS;
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleFileUpload(slide.id, file);
                          };
                          input.click();
                        }}
                      >
                        <Upload className="h-3 w-3" /> Upload
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={slide.title || ''}
                        onChange={e => updateSlide(slide.id, 'title', e.target.value)}
                        placeholder="Titre (optionnel)"
                        className="h-8 text-xs"
                      />
                      <Input
                        value={slide.subtitle || ''}
                        onChange={e => updateSlide(slide.id, 'subtitle', e.target.value)}
                        placeholder="Sous-titre (optionnel)"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeSlide(slide.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
          )}
        </CardContent>
      </Card>

      {/* Section 3: Messages */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Type className="h-4 w-4" /> Textes du Kiosk
          </CardTitle>
          <CardDescription className="text-xs">Messages affichés sur l'écran du kiosque</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Message d'accueil</Label>
            <Input
              value={activeConfig.welcomeMessage}
              onChange={e => update('welcomeMessage', e.target.value)}
              placeholder="Comment s'est passée votre expérience aujourd'hui ?"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Texte du bouton démarrer</Label>
            <Input
              value={activeConfig.startButtonText}
              onChange={e => update('startButtonText', e.target.value)}
              placeholder="Donner mon avis"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Texte du footer</Label>
            <Input
              value={activeConfig.footerText}
              onChange={e => update('footerText', e.target.value)}
              placeholder="Propulsé par QualityHub"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Per-branch override */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-display">Personnaliser par agence</CardTitle>
              <CardDescription className="text-xs">Surcharger la configuration globale pour une agence spécifique</CardDescription>
            </div>
            <Switch checked={perBranch} onCheckedChange={setPerBranch} />
          </div>
        </CardHeader>
        {perBranch && (
          <CardContent>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Sélectionner une agence" />
              </SelectTrigger>
              <SelectContent>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name} {b.city ? `— ${b.city}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBranch && !branchConfig && (
              <p className="text-xs text-muted-foreground mt-3">Aucune surcharge. Les paramètres globaux s'appliquent.</p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? 'Enregistrement…' : 'Enregistrer la config Kiosk'}
        </Button>
      </div>
    </div>
  );
}
