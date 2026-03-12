import { useAutoReset } from '@/hooks/useAutoReset';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

interface ThankYouScreenProps {
  sentiment: string;
  autoResetDelay: number;
  onReset: () => void;
}

const MESSAGES: Record<string, { title: string; subtitle: string }> = {
  very_happy: {
    title: 'Merci pour votre retour positif ! 🎉',
    subtitle: 'Votre satisfaction est notre priorité.',
  },
  happy: {
    title: 'Merci pour votre retour positif ! 😊',
    subtitle: 'Votre satisfaction est notre priorité.',
  },
  unhappy: {
    title: 'Merci de nous avoir fait part de votre expérience.',
    subtitle: 'Un responsable vous contactera si vous avez laissé vos coordonnées.',
  },
  very_unhappy: {
    title: 'Nous sommes désolés pour cette expérience.',
    subtitle: 'Un responsable vous contactera si vous avez laissé vos coordonnées.',
  },
};

const CIRCLE_SIZE = 120;
const STROKE_WIDTH = 6;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ThankYouScreen({ sentiment, autoResetDelay, onReset }: ThankYouScreenProps) {
  const { remaining, progress } = useAutoReset({
    seconds: autoResetDelay,
    onReset,
    pauseOnTouch: true,
  });

  const msg = MESSAGES[sentiment] || MESSAGES.happy;
  const dashOffset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <div className="w-full max-w-lg mx-auto text-center space-y-8" onClick={onReset}>
      {/* SVG progress circle */}
      <motion.div
        className="relative mx-auto"
        style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} className="-rotate-90">
          <circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={STROKE_WIDTH}
          />
          <circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <CheckCircle className="h-12 w-12 text-primary" />
        </div>
      </motion.div>

      {/* Messages */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2"
      >
        <h2 className="text-3xl font-display font-bold text-foreground">{msg.title}</h2>
        <p className="text-lg text-muted-foreground">{msg.subtitle}</p>
      </motion.div>

      {/* Countdown */}
      <div className="space-y-3 pt-2">
        <p className="text-sm text-muted-foreground">
          Nouvel avis dans {remaining} seconde{remaining > 1 ? 's' : ''}…
        </p>
        <p className="text-sm text-muted-foreground animate-pulse">
          Touchez l'écran pour recommencer
        </p>
      </div>
    </div>
  );
}
