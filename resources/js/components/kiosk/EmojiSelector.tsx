import { motion } from 'framer-motion';
import type { KioskQuestion } from '@/services/kioskService';
import SmileyFace, { SMILEY_CONFIG } from './SmileyFace';

interface EmojiSelectorProps {
  questions: KioskQuestion[];
  onSelect: (sentiment: string) => void;
  haptic?: () => void;
}

export default function EmojiSelector({ questions, onSelect, haptic }: EmojiSelectorProps) {
  return (
    <div className="flex flex-row flex-nowrap justify-center items-stretch gap-2 sm:gap-4 md:gap-6 w-full px-2">
      {questions.filter(q => q.isActive).map((q, i) => {
        const hasSmiley = !!SMILEY_CONFIG[q.sentiment];

        return (
          <motion.button
            key={q.sentiment}
            onClick={() => { haptic?.(); onSelect(q.sentiment); }}
            className="kiosk-sentiment-btn hover:shadow-lg flex-1 min-w-0 aspect-square"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
            aria-label={q.label}
          >
            <div className="w-1/2 aspect-square flex items-center justify-center">
              {hasSmiley ? (
                <SmileyFace sentiment={q.sentiment} size={200} className="w-full h-full" />
              ) : (
                <span className="text-[3rem] sm:text-[5rem] md:text-[6rem] lg:text-[8rem] leading-none">{q.emoji}</span>
              )}
            </div>
            <span className="text-[10px] sm:text-sm md:text-base font-medium text-muted-foreground leading-tight text-center">{q.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
