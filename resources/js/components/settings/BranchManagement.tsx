import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Loader2, Search, ChevronLeft, ChevronRight, Upload, Copy, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import BranchImportDialog from './BranchImportDialog';
import KioskQRCode from './KioskQRCode';

interface BranchRow {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  region: string | null;
  is_active: boolean;
  organization_id: string;
}

const emptyForm = { name: '', city: '', address: '', region: '' };
const PAGE_SIZE = 10;

export default function BranchManagement() {
  const { toast } = useToast();
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Filters & pagination
  const [search, setSearch] = useState('');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [page, setPage] = useState(0);

  const load = async () => {
    try {
      const { data: orgData } = await api.get('/settings/organization');
      const org = orgData?.organization ?? orgData;
      if (org?.id) setOrgId(org.id);
      const { data } = await api.get('/branches');
      const items = data?.branches ?? data?.data ?? (Array.isArray(data) ? data : []);
      setBranches(items as BranchRow[]);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Derived data
  const regions = useMemo(() => {
    const set = new Set(branches.map((b) => b.region).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [branches]);

  const filtered = useMemo(() => {
    let list = branches;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q) || b.city?.toLowerCase().includes(q) || b.address?.toLowerCase().includes(q));
    }
    if (filterRegion !== 'all') list = list.filter((b) => b.region === filterRegion);
    if (filterStatus !== 'all') list = list.filter((b) => (filterStatus === 'active' ? b.is_active : !b.is_active));
    return list;
  }, [branches, search, filterRegion, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [search, filterRegion, filterStatus]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (b: BranchRow) => {
    setEditingId(b.id);
    setForm({ name: b.name, city: b.city || '', address: b.address || '', region: b.region || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: 'Erreur', description: 'Le nom est requis', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/branches/${editingId}`, {
          name: form.name, city: form.city || null, address: form.address || null, region: form.region || null,
        });
        toast({ title: 'Agence modifiée' });
      } else {
        await api.post('/branches', {
          name: form.name, city: form.city || null, address: form.address || null, region: form.region || null,
        });
        toast({ title: 'Agence créée' });
      }
      setDialogOpen(false);
      await load();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const toggleActive = async (b: BranchRow) => {
    try {
      await api.put(`/branches/${b.id}`, { is_active: !b.is_active });
      setBranches((prev) => prev.map((x) => x.id === b.id ? { ...x, is_active: !x.is_active } : x));
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.response?.data?.message || err.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-display">Gestion des agences</CardTitle>
              <CardDescription className="text-xs">
                {filtered.length} agence{filtered.length > 1 ? 's' : ''} {filtered.length !== branches.length ? `sur ${branches.length}` : 'configurée' + (branches.length > 1 ? 's' : '')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setImportOpen(true)}>
                <Upload className="h-3.5 w-3.5" /> Importer
              </Button>
              <Button size="sm" className="gap-1.5" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" /> Nouvelle agence
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom, ville…"
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={filterRegion} onValueChange={setFilterRegion}>
              <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Province" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les provinces</SelectItem>
                {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nom</TableHead>
                  <TableHead className="text-xs">Ville</TableHead>
                  <TableHead className="text-xs">Province</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="text-xs">Kiosk</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="text-sm font-medium">{b.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{b.city || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{b.region || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={b.is_active ? 'default' : 'secondary'} className="text-xs">
                        {b.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {b.is_active ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            title="Copier le lien kiosk"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/kiosk/${b.id}`);
                              toast({ title: 'Lien copié !' });
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <a href={`/kiosk/${b.id}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Ouvrir le kiosk">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Switch checked={b.is_active} onCheckedChange={() => toggleActive(b)} />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paged.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Aucune agence trouvée</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Page {page + 1} sur {totalPages}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl w-full">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier l\'agence' : 'Nouvelle agence'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label>Nom *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Agence Principale" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Ville</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Casablanca" />
              </div>
              <div className="space-y-1">
                <Label>Province</Label>
                <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="Grand Casablanca" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Adresse</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Rue de la Banque" />
            </div>
            {editingId && (
              <div className="space-y-2 pt-2 border-t">
                <Label>Lien Kiosk</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 w-0 text-xs bg-muted px-2 py-1.5 rounded block truncate">
                    {window.location.origin}/kiosk/{editingId}
                  </code>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/kiosk/${editingId}`);
                      toast({ title: 'Lien copié !' });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex justify-center">
                  <KioskQRCode url={`${window.location.origin}/kiosk/${editingId}`} size={100} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : editingId ? 'Modifier' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BranchImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        orgId={orgId || ''}
        existingNames={branches.map(b => b.name)}
        onImported={load}
      />
    </div>
  );
}
