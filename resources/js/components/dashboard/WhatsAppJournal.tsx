import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type WhatsAppLog = {
  id: string;
  phone: string;
  message_type: string;
  status: string;
  error_message: string | null;
  branch_name: string | null;
  sentiment: string | null;
  created_at: string;
};

export default function WhatsAppJournal() {
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const { data } = await api.get('/whatsapp/logs', { params: { limit: 20 } });
        const items = data?.data ?? (Array.isArray(data) ? data : []);
        setLogs(items as WhatsAppLog[]);
      } catch {
        // silent
      }
      setLoading(false);
    }
    fetchLogs();
  }, []);

  const maskPhone = (phone: string) => {
    if (phone.length <= 4) return phone;
    return phone.slice(0, 2) + '••••' + phone.slice(-2);
  };

  const sentimentEmoji: Record<string, string> = {
    very_happy: '😍',
    happy: '😊',
    neutral: '😐',
    unhappy: '😞',
    very_unhappy: '😡',
  };

  const statusConfig: Record<string, { icon: typeof CheckCircle2; variant: 'default' | 'destructive' | 'secondary' | 'outline'; label: string }> = {
    sent: { icon: CheckCircle2, variant: 'default', label: 'Envoyé' },
    failed: { icon: XCircle, variant: 'destructive', label: 'Échoué' },
    pending: { icon: Clock, variant: 'secondary', label: 'En attente' },
  };

  const sentCount = logs.filter(l => l.status === 'sent').length;
  const failedCount = logs.filter(l => l.status === 'failed').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Journal WhatsApp
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="default" className="text-xs">
              {sentCount} envoyé{sentCount > 1 ? 's' : ''}
            </Badge>
            {failedCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {failedCount} échoué{failedCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Clock className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Aucun envoi WhatsApp enregistré
          </p>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {logs.map((log) => {
              const cfg = statusConfig[log.status] || statusConfig.pending;
              const Icon = cfg.icon;
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${log.status === 'sent' ? 'text-green-600' : log.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{maskPhone(log.phone)}</span>
                      {log.sentiment && (
                        <span title={log.sentiment}>{sentimentEmoji[log.sentiment] || '❓'}</span>
                      )}
                      <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0">
                        {cfg.label}
                      </Badge>
                    </div>
                    {log.branch_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">{log.branch_name}</p>
                    )}
                    {log.error_message && (
                      <p className="text-xs text-destructive mt-0.5 truncate" title={log.error_message}>
                        {log.error_message}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
                    {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: fr })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
