import { Textarea } from '@/components/ui/textarea';
interface Props { value: string; onChange: (v: string) => void; }
export default function LongText({ value, onChange }: Props) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={500}
      placeholder="Votre réponse"
      className="text-lg min-h-32"
      autoFocus
    />
  );
}
