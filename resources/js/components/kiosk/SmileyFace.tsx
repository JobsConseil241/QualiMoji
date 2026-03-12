interface SmileyFaceProps {
  sentiment: string;
  size?: number;
  className?: string;
}

const SMILEY_CONFIG: Record<string, { color: string; mouth: string; eyeY?: number }> = {
  very_happy: {
    color: '#16A34A',
    mouth: 'M 25,62 Q 50,85 75,62',
  },
  happy: {
    color: '#84CC16',
    mouth: 'M 28,60 Q 50,75 72,60',
  },
  unhappy: {
    color: '#F97316',
    mouth: 'M 28,72 Q 50,58 72,72',
  },
  very_unhappy: {
    color: '#DC2626',
    mouth: 'M 25,75 Q 50,55 75,75',
  },
};

// Fallback for custom sentiments
const FALLBACK = { color: '#6B7280', mouth: 'M 30,65 L 70,65' };

export default function SmileyFace({ sentiment, size = 80, className }: SmileyFaceProps) {
  const cfg = SMILEY_CONFIG[sentiment] || FALLBACK;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
    >
      {/* Face circle */}
      <circle cx="50" cy="50" r="46" fill={cfg.color} />

      {/* Eyes */}
      <ellipse cx="35" cy="40" rx="5" ry="6" fill="white" />
      <ellipse cx="65" cy="40" rx="5" ry="6" fill="white" />

      {/* Mouth */}
      <path
        d={cfg.mouth}
        fill="none"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export { SMILEY_CONFIG };
