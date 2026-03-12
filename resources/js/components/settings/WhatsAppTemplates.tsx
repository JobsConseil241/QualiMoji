import { useState, useEffect } from 'react';
import { MessageCircle, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

const DEFAULT_THANKYOU = 'Merci pour votre avis ! Votre retour est précieux pour {branch_name}.';
const DEFAULT_FOLLOWUP = 'Nous sommes désolés pour votre expérience. Un responsable vous recontactera dans les plus brefs délais.';

export default function WhatsAppTemplates() {
  const { toast } = useToast();
  const [thankyou, setThankyou] = useState(DEFAULT_THANKYOU);
  const [followup, setFollowup] = useState(DEFAULT_FOLLOWUP);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/whatsapp/templates');
        if (data?.whatsapp_thankyou) setThankyou(data.whatsapp_thankyou);
        if (data?.whatsapp_followup) setFollowup(data.whatsapp_followup);
      } catch (err) {
        // Use defaults if endpoint not available yet
        console.error('Failed to load WhatsApp templates:', err);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/whatsapp/templates', {
        whatsapp_thankyou: thankyou,
        whatsapp_followup: followup,
      });

      toast({ title: 'Templates sauvegardés', description: 'Les messages WhatsApp ont été mis à jour.' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-green-600" /> Messages WhatsApp client
        </CardTitle>
        <CardDescription className="text-xs">
          Personnalisez les messages envoyés automatiquement aux clients après un avis. Utilisez <code className="bg-muted px-1 rounded">{'{branch_name}'}</code> pour insérer le nom de l'agence.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="text-sm">Message de remerciement</Label>
          <Textarea
            value={thankyou}
            onChange={(e) => setThankyou(e.target.value)}
            rows={3}
            placeholder={DEFAULT_THANKYOU}
            className="text-sm"
          />
          <p className="text-[10px] text-muted-foreground">Envoyé à tous les clients ayant laissé un avis avec leur numéro.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Message de suivi (avis négatif)</Label>
          <Textarea
            value={followup}
            onChange={(e) => setFollowup(e.target.value)}
            rows={3}
            placeholder={DEFAULT_FOLLOWUP}
            className="text-sm"
          />
          <p className="text-[10px] text-muted-foreground">Ajouté après le remerciement pour les sentiments "insatisfait" et "très insatisfait".</p>
        </div>

        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Enregistrement…' : 'Sauvegarder les templates'}
        </Button>
      </CardContent>
    </Card>
  );
}
