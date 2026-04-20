import { Input } from '@/components/ui/input';
interface Props { value: string; onChange: (v: string) => void; }
export default function ShortText({ value, onChange }: Props) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={100}
      placeholder="Votre réponse"
      className="text-lg h-12"
      autoFocus
    />
  );
}
