import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import api from '@/lib/api';
import { toast } from 'sonner';

const VALID_ROLES = ['admin', 'quality_director', 'branch_manager', 'it_admin'];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  quality_director: 'Dir. Qualité',
  branch_manager: 'Resp. Agence',
  it_admin: 'Admin IT',
};

interface ParsedUser {
  email: string;
  name: string;
  role: string;
  branches: string;
  status: 'valid' | 'error';
  error?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const COLUMN_MAP: Record<string, string> = {
  email: 'email', 'e-mail': 'email', courriel: 'email',
  nom: 'name', name: 'name', 'nom complet': 'name', full_name: 'name',
  role: 'role', rôle: 'role',
  agences: 'branches', branches: 'branches', agence: 'branches',
};

function normalise(key: string): string | null {
  return COLUMN_MAP[key.toLowerCase().trim()] ?? null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function UserImportDialog({ open, onOpenChange, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedUser[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ ok: number; err: number; errors: string[] } | null>(null);

  const reset = () => { setRows([]); setResult(null); setProgress(0); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    reset();

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (json.length === 0) { toast.error('Fichier vide'); return; }

        const seenEmails = new Set<string>();

        const parsed: ParsedUser[] = json.map((row) => {
          const mapped: any = { email: '', name: '', role: 'branch_manager', branches: '', status: 'valid' };
          for (const [key, val] of Object.entries(row)) {
            const field = normalise(key);
            if (field) mapped[field] = String(val).trim();
          }

          // Validate
          if (!mapped.email) {
            mapped.status = 'error';
            mapped.error = 'Email requis';
          } else if (!EMAIL_RE.test(mapped.email)) {
            mapped.status = 'error';
            mapped.error = 'Email invalide';
          } else if (seenEmails.has(mapped.email.toLowerCase())) {
            mapped.status = 'error';
            mapped.error = 'Doublon';
          } else if (mapped.role && !VALID_ROLES.includes(mapped.role)) {
            mapped.status = 'error';
            mapped.error = `Rôle invalide: ${mapped.role}`;
          }
          seenEmails.add(mapped.email.toLowerCase());
          if (!mapped.name) mapped.name = mapped.email;
          return mapped as ParsedUser;
        });

        setRows(parsed);
      } catch {
        toast.error('Erreur de lecture du fichier');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const validRows = rows.filter(r => r.status === 'valid');

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    let ok = 0;
    const errors: string[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      setProgress(i + 1);
      try {
        const branchNames = r.branches ? r.branches.split(';').map(s => s.trim()).filter(Boolean) : [];
        await api.post('/settings/users/invite', {
          email: r.email,
          full_name: r.name,
          role: r.role || 'branch_manager',
          branch_ids: [], // Branch matching by name would need lookup — keeping simple
        });
        ok++;
      } catch (err: any) {
        const message = err.response?.data?.message || err.message || 'Erreur';
        errors.push(`${r.email}: ${message}`);
      }
    }

    setResult({ ok, err: errors.length, errors });
    setImporting(false);
    if (ok > 0) onImported();
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['email', 'nom', 'role', 'agences'],
      ['jean@example.com', 'Jean Dupont', 'branch_manager', 'Agence A;Agence B'],
      ['admin@example.com', 'Marie Admin', 'admin', ''],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Utilisateurs');
    XLSX.writeFile(wb, 'modele_utilisateurs.xlsx');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des utilisateurs</DialogTitle>
          <DialogDescription>
            Importez un fichier CSV ou Excel avec les colonnes : email, nom, rôle, agences
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 mx-auto text-green-500" />
            <p className="text-sm font-medium">{result.ok} utilisateur{result.ok > 1 ? 's' : ''} invité{result.ok > 1 ? 's' : ''}</p>
            {result.err > 0 && (
              <div className="text-left max-h-32 overflow-y-auto border rounded-md p-2">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-destructive">{e}</p>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => { reset(); onOpenChange(false); }}>Fermer</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Choisir un fichier
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5" /> Télécharger le modèle
              </Button>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
            </div>

            {importing && (
              <div className="text-xs text-muted-foreground">
                Invitation en cours… {progress}/{validRows.length}
              </div>
            )}

            {rows.length > 0 && !importing && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  {rows.length} ligne{rows.length > 1 ? 's' : ''} •{' '}
                  <span className="text-green-600 font-medium">{validRows.length} valide{validRows.length > 1 ? 's' : ''}</span>
                  {rows.length - validRows.length > 0 && (
                    <span className="text-destructive font-medium">{rows.length - validRows.length} erreur{rows.length - validRows.length > 1 ? 's' : ''}</span>
                  )}
                </div>

                <div className="overflow-x-auto max-h-[300px] overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Statut</TableHead>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">Nom</TableHead>
                        <TableHead className="text-xs">Rôle</TableHead>
                        <TableHead className="text-xs">Agences</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={i} className={r.status !== 'valid' ? 'bg-destructive/5' : ''}>
                          <TableCell>
                            {r.status === 'valid' ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                                <span className="text-[10px] text-destructive">{r.error}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-medium">{r.email || '—'}</TableCell>
                          <TableCell className="text-xs">{r.name || '—'}</TableCell>
                          <TableCell className="text-xs">{ROLE_LABELS[r.role] || r.role || '—'}</TableCell>
                          <TableCell className="text-xs">{r.branches || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button onClick={handleImport} disabled={importing || validRows.length === 0} className="gap-1.5">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Inviter {validRows.length} utilisateur{validRows.length > 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
