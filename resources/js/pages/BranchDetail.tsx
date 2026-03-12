import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Star, MessageSquare, AlertTriangle, UserCheck, MapPin,
  Phone, Mail, User, Filter, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/StatCard';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Bar, BarChart, Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { fetchBranchDetail } from '@/services/dataService';
import type { DbFeedback } from '@/services/dataService';

const sentimentConfig: Record<string, { label: string; color: string }> = {
  very_happy: { label: 'Très satisfait', color: 'bg-success/10 text-success border-success/30' },
  happy: { label: 'Satisfait', color: 'bg-primary/10 text-primary border-primary/30' },
  unhappy: { label: 'Insatisfait', color: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  very_unhappy: { label: 'Très insatisfait', color: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const ISSUE_COLORS = [
  'hsl(0, 72%, 51%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 36%)',
  'hsl(164, 70%, 40%)', 'hsl(280, 60%, 50%)',
];

function sentimentToScore(s: string): number {
  const map: Record<string, number> = { very_happy: 4, happy: 3, unhappy: 2, very_unhappy: 1 };
  return map[s] || 2;
}

function getComment(f: any): string {
  const resp = f.follow_up_responses;
  if (!resp) return '';
  if (resp.comment) return resp.comment;
  if (resp.selectedOptions && Array.isArray(resp.selectedOptions)) return resp.selectedOptions.join(', ');
  if (resp.freeText) return resp.freeText;
  return '';
}

export default function BranchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const result = await fetchBranchDetail(id, '30d');
        setData(result);
      } catch (err) {
        console.error('Failed to load branch detail:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const feedbacks: any[] = data?.feedbacks ?? [];
  const filteredFeedbacks = useMemo(() => {
    if (sentimentFilter === 'all') return feedbacks;
    return feedbacks.filter((f: any) => f.sentiment === sentimentFilter);
  }, [feedbacks, sentimentFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.branch || !data?.stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Agence introuvable</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/branches')}>Retour</Button>
      </div>
    );
  }

  const branch = data.branch;
  const stats = data.stats;
  const evolution: any[] = data.evolution ?? [];
  const issues: any[] = data.issues ?? [];
  const satisfactionPct = Math.round(stats.satisfaction_rate ?? 0);
  const positiveRate = Math.round(stats.positive_rate ?? 0);
  const rank = stats.rank ?? 0;
  const totalBranches = stats.total_branches ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" size="icon" className="shrink-0 self-start" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-display font-bold tracking-tight">{branch.name}</h1>
            <Badge variant="outline" className="text-xs font-display">
              #{rank} / {totalBranches}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{branch.address || branch.city} · {branch.region}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={cn('text-3xl font-display font-bold', satisfactionPct >= 80 ? 'text-success' : satisfactionPct >= 60 ? 'text-warning' : 'text-destructive')}>
              {satisfactionPct}%
            </p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Satisfaction" value={`${satisfactionPct}%`} icon={Star} subtitle="score global" colorMode="satisfaction" rawValue={satisfactionPct} />
        <StatCard title="Feedbacks" value={(stats.total_feedbacks ?? 0).toLocaleString()} icon={MessageSquare} subtitle="total reçus" />
        <StatCard title="Alertes actives" value={stats.active_alerts ?? 0} icon={AlertTriangle} colorMode="alert" rawValue={stats.active_alerts ?? 0} subtitle="en cours" />
        <StatCard title="Taux positif" value={`${positiveRate}%`} icon={UserCheck} subtitle="satisfaits + très satisfaits" progress={positiveRate} />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
        {/* Satisfaction Evolution */}
        <Card className="glass-card lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Évolution de la satisfaction</CardTitle>
            <p className="text-xs text-muted-foreground">Score moyen par semaine</p>
          </CardHeader>
          <CardContent>
            {evolution.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={evolution} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="score" name={branch.name} stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Pas encore de données</p>
            )}
          </CardContent>
        </Card>

        {/* Common Issues */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Problèmes fréquents</CardTitle>
            <p className="text-xs text-muted-foreground">Issues les plus signalées</p>
          </CardHeader>
          <CardContent>
            {issues.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={issues} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={120} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', fontSize: '12px' }} formatter={(v: number) => [`${v}%`, 'Part']} />
                  <Bar dataKey="percentage" radius={[0, 6, 6, 0]} barSize={20}>
                    {issues.map((_, i) => (
                      <Cell key={i} fill={ISSUE_COLORS[i % ISSUE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Aucun problème signalé</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feedbacks */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-display">Feedbacks récents</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="very_happy">Très satisfait</SelectItem>
                  <SelectItem value="happy">Satisfait</SelectItem>
                  <SelectItem value="unhappy">Insatisfait</SelectItem>
                  <SelectItem value="very_unhappy">Très insatisfait</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredFeedbacks.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucun feedback pour ce filtre.</p>
          )}
          {filteredFeedbacks.map((f: any) => {
            const sentCfg = sentimentConfig[f.sentiment] || sentimentConfig.unhappy;
            const score = sentimentToScore(f.sentiment);
            const comment = getComment(f);
            return (
              <button
                key={f.id}
                className="w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all hover:bg-muted/50"
                onClick={() => setSelectedFeedback(f)}
              >
                <Badge variant="outline" className={cn('mt-0.5 text-[10px] shrink-0', sentCfg.color)}>
                  {score}/5
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-2">{comment || sentCfg.label}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(f.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 h-4', sentCfg.color)}>
                      {sentCfg.label}
                    </Badge>
                    {f.customer_name && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <User className="h-2.5 w-2.5" /> {f.customer_name}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Feedback Detail Modal */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedFeedback && (() => {
            const sentCfg = sentimentConfig[selectedFeedback.sentiment] || sentimentConfig.unhappy;
            const score = sentimentToScore(selectedFeedback.sentiment);
            const comment = getComment(selectedFeedback);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display flex items-center gap-2">
                    Détail du feedback
                    <Badge variant="outline" className={cn('text-xs', sentCfg.color)}>
                      {sentCfg.label}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={cn('h-4 w-4', s <= score ? 'text-warning fill-warning' : 'text-muted-foreground/30')} />
                      ))}
                    </div>
                    <span className="text-sm font-medium">{score}/5</span>
                  </div>

                  {comment && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Commentaire / Réponses</p>
                      <p className="text-sm">{comment}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Sentiment</p>
                      <p className="font-medium">{sentCfg.label}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium">
                        {new Date(selectedFeedback.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {(selectedFeedback.customer_name || selectedFeedback.customer_email || selectedFeedback.customer_phone) && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground mb-2">Coordonnées client</p>
                      <div className="space-y-1.5">
                        {selectedFeedback.customer_name && (
                          <div className="flex items-center gap-2 text-sm"><User className="h-3.5 w-3.5 text-muted-foreground" /> {selectedFeedback.customer_name}</div>
                        )}
                        {selectedFeedback.customer_email && (
                          <div className="flex items-center gap-2 text-sm"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {selectedFeedback.customer_email}</div>
                        )}
                        {selectedFeedback.customer_phone && (
                          <div className="flex items-center gap-2 text-sm"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {selectedFeedback.customer_phone}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
