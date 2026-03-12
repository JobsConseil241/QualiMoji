import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScreensaverSlide } from '@/services/kioskConfigService';

const DEFAULT_SLIDES: ScreensaverSlide[] = [
  { id: 'default-1', imageUrl: '', title: 'Votre avis compte', subtitle: 'Aidez-nous à améliorer nos services', order: 0 },
  { id: 'default-2', imageUrl: '', title: 'Merci de votre confiance', subtitle: 'Votre satisfaction est notre priorité', order: 1 },
  { id: 'default-3', imageUrl: '', title: 'Donnez votre avis', subtitle: 'Touchez l\'écran pour commencer', order: 2 },
];

const ADVANCE_INTERVAL = 6000;

interface ScreensaverProps {
  slides?: ScreensaverSlide[];
  primaryColor?: string;
  onDismiss: () => void;
}

export default function Screensaver({ slides, primaryColor, onDismiss }: ScreensaverProps) {
  const activeSlides = slides && slides.length > 0 ? slides : DEFAULT_SLIDES;
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeSlides.length);
    }, ADVANCE_INTERVAL);
    return () => clearInterval(timer);
  }, [activeSlides.length]);

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const slide = activeSlides[currentIndex];

  return (
    <div
      className="kiosk-screensaver"
      onClick={handleDismiss}
      onTouchStart={handleDismiss}
      role="button"
      tabIndex={0}
      aria-label="Touchez pour commencer"
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: primaryColor
            ? `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 40%, ${primaryColor}99 100%)`
            : 'linear-gradient(135deg, hsl(199 89% 36%) 0%, hsl(199 89% 28%) 40%, hsl(215 25% 12%) 100%)',
        }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative z-10 flex flex-col items-center justify-center h-full px-8 text-center"
        >
          {slide.imageUrl && (
            <img
              src={slide.imageUrl}
              alt=""
              className="max-h-[30vh] object-contain mb-8 rounded-2xl"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          {slide.title && (
            <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-4 drop-shadow-lg">
              {slide.title}
            </h1>
          )}
          {slide.subtitle && (
            <p className="text-xl md:text-2xl text-white/80 max-w-2xl drop-shadow">
              {slide.subtitle}
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dots indicator */}
      {activeSlides.length > 1 && (
        <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-2 z-20">
          {activeSlides.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === currentIndex ? 'bg-white scale-125' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      )}

      {/* Tap hint animation */}
      <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-3 z-20">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-14 h-14 rounded-full border-2 border-white/50 flex items-center justify-center"
        >
          <motion.div
            animate={{ scale: [1, 0.85, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-6 h-6 rounded-full bg-white/60"
          />
        </motion.div>
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-lg text-white/70 font-medium"
        >
          Touchez l'écran pour commencer
        </motion.p>
      </div>
    </div>
  );
}
