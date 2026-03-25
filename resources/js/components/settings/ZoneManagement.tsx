import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Zone {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  branches_count: number;
  active_branches_count: number;
}

const emptyForm = { name: '', description: '' };

export default function ZoneManagement() {
  const { toast } = useToast();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/zones');
      setZones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load zones:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (z: Zone) => {
    setEditingId(z.id);
    setForm({ name: z.name, description: z.description || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: 'Erreur', description: 'Le nom est requis', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/zones/${editingId}`, form);
        toast({ title: 'Zone modifiée' });
      } else {
        await api.post('/zones', form);
        toast({ title: 'Zone créée' });
      }
      setDialogOpen(false);
      await load();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/zones/${id}`);
      toast({ title: 'Zone supprimée' });
      await load();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.response?.data?.message || err.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (z: Zone) => {
    try {
      await api.put(`/zones/${z.id}`, { name: z.name, is_active: !z.is_active });
      setZones(prev => prev.map(x => x.id === z.id ? { ...x, is_active: !x.is_active } : x));
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
              <CardTitle className="text-base font-display">Gestion des zones</CardTitle>
              <CardDescription className="text-xs">
                {zones.length} zone{zones.length > 1 ? 's' : ''} configurée{zones.length > 1 ? 's' : ''}
              </CardDescription>
            </div>
            <Button size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Nouvelle zone
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nom</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs">Agences</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                      <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      Aucune zone configurée. Créez des zones pour regrouper vos agences.
                    </TableCell>
                  </TableRow>
                ) : (
                  zones.map(z => (
                    <TableRow key={z.id}>
                      <TableCell className="text-sm font-medium">{z.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{z.description || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {z.active_branches_count} active{z.active_branches_count > 1 ? 's' : ''} / {z.branches_count} total
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={z.is_active ? 'default' : 'secondary'} className="text-xs">
                          {z.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Switch checked={z.is_active} onCheckedChange={() => toggleActive(z)} />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(z)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer la zone "{z.name}" ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Les agences de cette zone ne seront pas supprimées, elles seront simplement désassignées.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(z.id)} className="bg-destructive text-destructive-foreground">
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier la zone' : 'Nouvelle zone'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label>Nom *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Zone Nord" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Paris, Lille, Strasbourg" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : editingId ? 'Modifier' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
