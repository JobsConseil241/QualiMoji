import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';

interface OrgData {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  kiosk_logo_size: string;
  kiosk_logo_position: string;
  kiosk_show_org_name: boolean;
  kiosk_show_branch_name: boolean;
}

export default function OrganizationConfig() {
  const { toast } = useToast();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/settings/organization');
        const org = data?.organization ?? data;
        if (org) setOrg(org as OrgData);
      } catch {
        // silent
      }
      setLoading(false);
    })();
  }, []);

  const handleUpdate = async (field: keyof OrgData, value: string | boolean) => {
    if (!org) return;
    setOrg({ ...org, [field]: value } as OrgData);
    try {
      await api.put(`/settings/organization`, { [field]: value });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.response?.data?.message || err.message, variant: 'destructive' });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !org) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erreur', description: 'Veuillez sélectionner une image', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Erreur', description: 'L\'image ne doit pas dépasser 2 Mo', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const { data: uploadData } = await api.post('/settings/organization/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = uploadData.logo_url || uploadData.url;
      if (url) {
        setOrg({ ...org, logo_url: url } as OrgData);
      }
      toast({ title: 'Logo mis à jour' });
    } catch (err: any) {
      toast({ title: 'Erreur d\'upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeLogo = async () => {
    if (!org) return;
    await handleUpdate('logo_url', '');
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!org) return <p className="text-sm text-muted-foreground">Aucune organisation trouvée.</p>;

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display">Informations de la banque</CardTitle>
          <CardDescription className="text-xs">Nom, logo et identité visuelle de votre organisation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm">Nom de l'organisation</Label>
            <Input
              value={org.name}
              onChange={(e) => setOrg({ ...org, name: e.target.value })}
              onBlur={(e) => handleUpdate('name', e.target.value)}
              placeholder="Nom de la banque"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Logo</Label>
            {org.logo_url ? (
              <div className="flex items-center gap-4 p-4 border rounded-md bg-muted/30">
                <img
                  src={org.logo_url}
                  alt="Logo"
                  className="max-h-16 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Changer
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={removeLogo}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-md text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <Upload className="h-8 w-8" />
                )}
                <span className="text-sm font-medium">{uploading ? 'Upload en cours…' : 'Cliquer pour uploader un logo'}</span>
                <span className="text-xs">PNG, JPG, SVG — max 2 Mo</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Couleur principale</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={org.primary_color || '#1B4F72'}
                onChange={(e) => setOrg({ ...org, primary_color: e.target.value })}
                onBlur={(e) => handleUpdate('primary_color', e.target.value)}
                className="h-10 w-14 rounded border cursor-pointer"
              />
              <Input
                value={org.primary_color || '#1B4F72'}
                onChange={(e) => setOrg({ ...org, primary_color: e.target.value })}
                onBlur={(e) => handleUpdate('primary_color', e.target.value)}
                className="w-32 font-mono text-sm"
                placeholder="#1B4F72"
              />
              <div className="h-10 flex-1 rounded-md" style={{ backgroundColor: org.primary_color || '#1B4F72' }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kiosk Display Settings */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display">Affichage Kiosk</CardTitle>
          <CardDescription className="text-xs">Personnalisez l'apparence du logo et des textes sur le kiosk</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Taille du logo</Label>
              <Select value={org.kiosk_logo_size} onValueChange={(v) => handleUpdate('kiosk_logo_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Petit (40px)</SelectItem>
                  <SelectItem value="medium">Moyen (64px)</SelectItem>
                  <SelectItem value="large">Grand (96px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Position du logo</Label>
              <Select value={org.kiosk_logo_position} onValueChange={(v) => handleUpdate('kiosk_logo_position', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Gauche</SelectItem>
                  <SelectItem value="center">Centre</SelectItem>
                  <SelectItem value="right">Droite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Afficher le nom de l'organisation</Label>
              <Switch
                checked={org.kiosk_show_org_name}
                onCheckedChange={(checked) => handleUpdate('kiosk_show_org_name', checked as any)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Afficher le nom de l'agence</Label>
              <Switch
                checked={org.kiosk_show_branch_name}
                onCheckedChange={(checked) => handleUpdate('kiosk_show_branch_name', checked as any)}
              />
            </div>
          </div>

          {/* Preview */}
          {org.logo_url && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Aperçu</Label>
              <div className="border rounded-lg p-6 bg-background">
                <div className={`flex flex-col gap-2 items-${org.kiosk_logo_position === 'left' ? 'start' : org.kiosk_logo_position === 'right' ? 'end' : 'center'}`}>
                  <img
                    src={org.logo_url}
                    alt="Preview"
                    className="object-contain"
                    style={{ height: org.kiosk_logo_size === 'small' ? 40 : org.kiosk_logo_size === 'large' ? 96 : 64 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  {org.kiosk_show_org_name && <span className="text-sm font-display font-bold">{org.name}</span>}
                  {org.kiosk_show_branch_name && <span className="text-xs text-muted-foreground">Nom de l'agence</span>}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
