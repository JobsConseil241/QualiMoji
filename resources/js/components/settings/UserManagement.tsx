import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Users, Plus, Pencil, Ban, Loader2, Mail, Shield, Search, RotateCw, History, Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { mockBranches } from '@/data/mockData';
import UserImportDialog from './UserImportDialog';

/* ---------- types ---------- */
interface ManagedUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  last_sign_in_at: string | null;
  created_at: string;
  branch_ids: string[];
}

interface AuditLog {
  id: string;
  actor_email: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  admin: { label: 'Administrateur', color: 'bg-destructive/10 text-destructive border-destructive/20', description: 'Accès complet' },
  quality_director: { label: 'Directeur Qualité', color: 'bg-primary/10 text-primary border-primary/20', description: 'Dashboard, agences, alertes, rapports, paramètres KPI/Questions' },
  branch_manager: { label: 'Responsable Agence', color: 'bg-accent/10 text-accent-foreground border-accent/20', description: 'Données de ses agences uniquement' },
  it_admin: { label: 'Admin IT', color: 'bg-warning/10 text-warning border-warning/20', description: 'Gestion utilisateurs, système, logs' },
};

const ACTION_LABELS: Record<string, string> = {
  user_invited: 'Utilisateur invité',
  user_role_changed: 'Rôle modifié',
  user_deactivated: 'Utilisateur désactivé',
  user_activated: 'Utilisateur activé',
  user_branches_updated: 'Agences mises à jour',
  invitation_resent: 'Invitation renvoyée',
};

const emptyForm = {
  full_name: '',
  email: '',
  role: 'branch_manager' as string,
  branch_ids: [] as string[],
  is_active: true,
};

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [form, setForm] = useState(emptyForm);
  const [importOpen, setImportOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get('/settings/users');
      const items = data?.users ?? data?.data ?? (Array.isArray(data) ? data : []);
      setUsers((items as any[]).map(u => ({ ...u, branch_ids: u.branch_ids ?? [] })) as ManagedUser[]);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
    setLoading(false);
  }, [user]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const { data } = await api.get('/settings/audit-logs', { params: { limit: 100 } });
      const items = data?.audit_logs ?? data?.data ?? (Array.isArray(data) ? data : []);
      setAuditLogs(items as AuditLog[]);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchAuditLogs();
  }, [fetchUsers, fetchAuditLogs]);

  const handleInvite = async () => {
    if (!form.email.trim()) { toast.error('Veuillez saisir un email'); return; }
    if (!form.role) { toast.error('Veuillez sélectionner un rôle'); return; }

    setSaving(true);
    try {
      await api.post('/settings/users/invite', {
        email: form.email,
        full_name: form.full_name || form.email,
        role: form.role,
        branch_ids: form.role === 'branch_manager' ? form.branch_ids : [],
      });

      toast.success('Invitation envoyée avec succès');
      setShowDialog(false);
      setForm(emptyForm);
      setEditingUserId(null);
      fetchUsers();
      fetchAuditLogs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Erreur lors de l\'invitation');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingUserId || !user) return;
    setSaving(true);
    try {
      await api.put(`/settings/users/${editingUserId}`, {
        role: form.role,
        branch_ids: form.role === 'branch_manager' ? form.branch_ids : [],
        is_active: form.is_active,
      });

      toast.success('Utilisateur mis à jour');
      setShowDialog(false);
      setEditingUserId(null);
      setForm(emptyForm);
      fetchUsers();
      fetchAuditLogs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const toggleUserActive = async (targetUser: ManagedUser) => {
    if (!user) return;
    const newActive = !targetUser.is_active;
    try {
      await api.put(`/settings/users/${targetUser.id}`, { is_active: newActive });
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, is_active: newActive } : u));
      fetchAuditLogs();
      toast.success(newActive ? 'Utilisateur activé' : 'Utilisateur désactivé');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Erreur');
    }
  };

  const openEdit = (u: ManagedUser) => {
    setEditingUserId(u.id);
    setForm({
      full_name: u.full_name,
      email: u.full_name, // Display only
      role: u.role,
      branch_ids: u.branch_ids,
      is_active: u.is_active,
    });
    setShowDialog(true);
  };

  const openCreate = () => {
    setEditingUserId(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const resendInvite = async (targetUser: ManagedUser) => {
    if (!user) return;
    try {
      await api.post('/settings/users/invite', {
        email: targetUser.email || targetUser.full_name,
        full_name: targetUser.full_name,
        role: targetUser.role,
        branch_ids: targetUser.branch_ids,
      });
      fetchAuditLogs();
      toast.success('Invitation renvoyée');
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Erreur';
      if (message.toLowerCase().includes('already') || message.toLowerCase().includes('déjà')) {
        toast.info('Cet utilisateur a déjà activé son compte');
      } else {
        toast.error(message);
      }
    }
  };

  const toggleBranch = (id: string) =>
    setForm(f => ({
      ...f,
      branch_ids: f.branch_ids.includes(id)
        ? f.branch_ids.filter(b => b !== id)
        : [...f.branch_ids, id],
    }));

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || u.full_name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? u.is_active : !u.is_active);
    const matchesBranch = filterBranch === 'all' || u.branch_ids.includes(filterBranch);
    return matchesSearch && matchesRole && matchesStatus && matchesBranch;
  });

  const activeFiltersCount = [filterRole, filterStatus, filterBranch].filter(f => f !== 'all').length;

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Utilisateurs</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5"><History className="h-3.5 w-3.5" /> Journal d'audit</TabsTrigger>
        </TabsList>

        {/* ===== USERS TAB ===== */}
        <TabsContent value="users" className="space-y-4">
          {/* Search + Filters row */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un utilisateur…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setImportOpen(true)}>
                  <Upload className="h-3.5 w-3.5" /> Importer
                </Button>
                <Button size="sm" className="gap-1.5" onClick={openCreate}>
                  <Plus className="h-3.5 w-3.5" /> Inviter un utilisateur
                </Button>
              </div>
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Filtres :</span>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="h-7 w-auto min-w-[130px] text-xs">
                  <SelectValue placeholder="Rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger className="h-7 w-auto min-w-[140px] text-xs">
                  <SelectValue placeholder="Agence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les agences</SelectItem>
                  {mockBranches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name.replace('Agence ', '')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost" size="sm"
                  className="h-7 text-xs text-muted-foreground gap-1"
                  onClick={() => { setFilterRole('all'); setFilterStatus('all'); setFilterBranch('all'); }}
                >
                  Réinitialiser ({activeFiltersCount})
                </Button>
              )}
            </div>
          </div>

          <Card className="glass-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-10"></TableHead>
                      <TableHead className="text-xs">Nom</TableHead>
                      <TableHead className="text-xs">Rôle</TableHead>
                      <TableHead className="text-xs">Agences</TableHead>
                      <TableHead className="text-xs">Statut</TableHead>
                      <TableHead className="text-xs">Dernière connexion</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                          Aucun utilisateur trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map(u => {
                        const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.branch_manager;
                        const branchNames = u.branch_ids
                          .map(bid => mockBranches.find(b => b.id === bid)?.name.replace('Agence ', ''))
                          .filter(Boolean);

                        return (
                          <TableRow key={u.id} className={cn(!u.is_active && 'opacity-50')}>
                            <TableCell>
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={u.avatar_url || undefined} />
                                <AvatarFallback className="text-[10px] bg-muted">{getInitials(u.full_name)}</AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-medium truncate max-w-[180px]">{u.full_name}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn('text-[10px] font-medium', rc.color)}>
                                {rc.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {branchNames.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {branchNames.map((n, i) => (
                                    <Badge key={i} variant="secondary" className="text-[10px]">{n}</Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {u.role === 'branch_manager' ? 'Non assigné' : '—'}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.is_active ? 'default' : 'secondary'} className="text-[10px]">
                                {u.is_active ? 'Actif' : 'Inactif'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {u.last_sign_in_at
                                ? format(new Date(u.last_sign_in_at), 'dd/MM/yyyy HH:mm', { locale: fr })
                                : 'Jamais'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)} title="Éditer">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => resendInvite(u)} title="Renvoyer invitation">
                                  <Mail className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon"
                                  className={cn('h-7 w-7', !u.is_active ? 'text-accent' : 'text-destructive')}
                                  onClick={() => toggleUserActive(u)}
                                  title={u.is_active ? 'Désactiver' : 'Activer'}
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Role legend */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-1.5">
                <Shield className="h-4 w-4" /> Rôles et permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                  <div key={key} className="flex items-start gap-2">
                    <Badge variant="outline" className={cn('text-[10px] mt-0.5 shrink-0', cfg.color)}>{cfg.label}</Badge>
                    <p className="text-[11px] text-muted-foreground">{cfg.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== AUDIT TAB ===== */}
        <TabsContent value="audit" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-display font-semibold">Journal d'audit</h3>
              <p className="text-xs text-muted-foreground">Historique des actions utilisateurs</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchAuditLogs}>
              <RotateCw className="h-3.5 w-3.5" /> Actualiser
            </Button>
          </div>

          <Card className="glass-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Acteur</TableHead>
                      <TableHead className="text-xs">Action</TableHead>
                      <TableHead className="text-xs">Détails</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                          Aucune entrée dans le journal
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditLogs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </TableCell>
                          <TableCell className="text-xs font-medium">{log.actor_email || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {ACTION_LABELS[log.action] || log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">
                            {log.details?.email || log.details?.full_name || log.details?.role || '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== CREATE/EDIT DIALOG ===== */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingUserId ? 'Modifier l\'utilisateur' : 'Inviter un utilisateur'}
            </DialogTitle>
            <DialogDescription>
              {editingUserId
                ? 'Modifiez le rôle et les permissions de cet utilisateur'
                : 'Un email d\'invitation sera envoyé avec un lien de création de mot de passe (expire sous 48h)'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!editingUserId && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nom complet</Label>
                    <Input
                      placeholder="Jean Dupont"
                      value={form.full_name}
                      onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Email *</Label>
                    <Input
                      type="email"
                      placeholder="jean@example.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Rôle *</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span>{cfg.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.role === 'branch_manager' && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Agences assignées</Label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                    {mockBranches.map(b => (
                      <label key={b.id} className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-pointer transition-colors text-xs',
                        form.branch_ids.includes(b.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      )}>
                        <Checkbox
                          checked={form.branch_ids.includes(b.id)}
                          onCheckedChange={() => toggleBranch(b.id)}
                        />
                        {b.name.replace('Agence ', '')}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {editingUserId && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-semibold">Compte actif</Label>
                    <p className="text-[10px] text-muted-foreground">Désactiver empêche la connexion</p>
                  </div>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
            <Button
              onClick={editingUserId ? handleUpdateRole : handleInvite}
              disabled={saving}
              className="gap-1.5"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingUserId ? <Pencil className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
              {editingUserId ? 'Mettre à jour' : 'Envoyer l\'invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => { fetchUsers(); fetchAuditLogs(); }}
      />
    </div>
  );
}
