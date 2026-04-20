import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BranchModeEntry, QuestionnaireMode } from '@/types/questionnaire';

interface Props {
  orgMode: QuestionnaireMode;
  branches: BranchModeEntry[];
  onOverride: (branchId: string, mode: QuestionnaireMode) => void;
  onRestoreInherit: (branchId: string) => void;
  onEditContent?: (branch: BranchModeEntry, effectiveMode: QuestionnaireMode) => void;
}

export function BranchOverridePanel({ orgMode, branches, onOverride, onRestoreInherit, onEditContent }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agence</TableHead>
          <TableHead>Mode effectif</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {branches.map((b) => {
          const inherits = b.mode === null;
          const effective = (inherits ? orgMode : b.mode) as QuestionnaireMode;
          return (
            <TableRow key={b.branch_id}>
              <TableCell>{b.name}</TableCell>
              <TableCell>
                <Badge variant={inherits ? 'outline' : 'default'}>
                  {effective === 'quadrimoji' ? 'Quadrimoji' : 'Questions ouvertes'}
                  {inherits && ' · hérité'}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                {onEditContent && (
                  <Button size="sm" variant="secondary" onClick={() => onEditContent(b, effective)}>
                    Éditer questions
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOverride(b.branch_id, effective === 'quadrimoji' ? 'open' : 'quadrimoji')}
                >
                  Passer en {effective === 'quadrimoji' ? 'Ouvertes' : 'Quadrimoji'}
                </Button>
                {!inherits && (
                  <Button size="sm" variant="ghost" onClick={() => onRestoreInherit(b.branch_id)}>
                    Hériter
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
