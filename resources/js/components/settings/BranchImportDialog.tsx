import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { importBranches } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';

interface ParsedBranch {
  name: string;
  city: string;
  region: string;
  address: string;
  status: 'valid' | 'error' | 'duplicate';
  error?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  existingNames: string[];
  onImported: () => void;
}

const COLUMN_MAP: Record<string, keyof ParsedBranch> = {
  nom: 'name', name: 'name',
  ville: 'city', city: 'city',
  region: 'region', région: 'region', province: 'region',
  adresse: 'address', address: 'address',
};

function normalise(key: string): keyof ParsedBranch | null {
  return COLUMN_MAP[key.toLowerCase().trim()] ?? null;
}

export default function BranchImportDialog({ open, onOpenChange, orgId, existingNames, onImported }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedBranch[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; err: number } | null>(null);

  const reset = () => { setRows([]); setResult(null); };

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

        if (json.length === 0) {
          toast({ title: 'Fichier vide', variant: 'destructive' });
          return;
        }

        const lowerExisting = existingNames.map(n => n.toLowerCase().trim());
        const seenNames = new Set<string>();

        const parsed: ParsedBranch[] = json.map((row) => {
          const mapped: any = { name: '', city: '', region: '', address: '', status: 'valid' };
          for (const [key, val] of Object.entries(row)) {
            const field = normalise(key);
            if (field && field !== 'status' && field !== 'error') mapped[field] = String(val).trim();
          }
          if (!mapped.name) {
            mapped.status = 'error';
            mapped.error = 'Nom requis';
          } else if (lowerExisting.includes(mapped.name.toLowerCase()) || seenNames.has(mapped.name.toLowerCase())) {
            mapped.status = 'duplicate';
            mapped.error = 'Doublon';
          }
          seenNames.add(mapped.name.toLowerCase());
          return mapped as ParsedBranch;
        });

        setRows(parsed);
      } catch {
        toast({ title: 'Erreur de lecture du fichier', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const validRows = rows.filter(r => r.status === 'valid');

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    let ok = 0, err = 0;

    const toInsert = validRows.map(r => ({
      name: r.name,
      city: r.city || null,
      region: r.region || null,
      address: r.address || null,
    }));

    try {
      const result = await importBranches(toInsert);
      ok = result?.imported ?? toInsert.length;
      err = result?.errors ?? 0;
    } catch {
      err = toInsert.length;
    }

    setResult({ ok, err });
    setImporting(false);
    if (ok > 0) onImported();
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['nom', 'ville', 'province', 'adresse'],
      ['Agence Exemple', 'Casablanca', 'Grand Casablanca', '12 Rue Exemple'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Agences');
    XLSX.writeFile(wb, 'modele_agences.xlsx');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des agences</DialogTitle>
          <DialogDescription>
            Importez un fichier CSV ou Excel avec les colonnes : nom, ville, province, adresse
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 mx-auto text-green-500" />
            <p className="text-sm font-medium">{result.ok} agence{result.ok > 1 ? 's' : ''} importée{result.ok > 1 ? 's' : ''}</p>
            {result.err > 0 && <p className="text-xs text-destructive">{result.err} erreur{result.err > 1 ? 's' : ''}</p>}
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

            {rows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  {rows.length} ligne{rows.length > 1 ? 's' : ''} détectée{rows.length > 1 ? 's' : ''} •{' '}
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
                        <TableHead className="text-xs">Nom</TableHead>
                        <TableHead className="text-xs">Ville</TableHead>
                        <TableHead className="text-xs">Province</TableHead>
                        <TableHead className="text-xs">Adresse</TableHead>
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
                          <TableCell className="text-xs font-medium">{r.name || '—'}</TableCell>
                          <TableCell className="text-xs">{r.city || '—'}</TableCell>
                          <TableCell className="text-xs">{r.region || '—'}</TableCell>
                          <TableCell className="text-xs">{r.address || '—'}</TableCell>
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
                Importer {validRows.length} agence{validRows.length > 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
