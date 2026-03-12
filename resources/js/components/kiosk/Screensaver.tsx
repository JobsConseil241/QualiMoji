import { useState, useEffect, useCallback, useRef } from 'react';
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

function SlideLayer({ slide, primaryColor }: { slide: ScreensaverSlide; primaryColor?: string }) {
  const hasImage = !!slide.imageUrl;
  return (
    <>
      {hasImage ? (
        <img
          src={slide.imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: primaryColor
              ? `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 40%, ${primaryColor}99 100%)`
              : 'linear-gradient(135deg, hsl(199 89% 36%) 0%, hsl(199 89% 28%) 40%, hsl(215 25% 12%) 100%)',
          }}
        />
      )}
      {hasImage && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
      )}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center px-8 pb-32">
        {slide.title && (
          <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-3 drop-shadow-lg text-center">
            {slide.title}
          </h1>
        )}
        {slide.subtitle && (
          <p className="text-xl md:text-2xl text-white/80 max-w-2xl drop-shadow text-center">
            {slide.subtitle}
          </p>
        )}
      </div>
    </>
  );
}

export default function Screensaver({ slides, primaryColor, onDismiss }: ScreensaverProps) {
  const activeSlides = slides && slides.length > 0 ? slides : DEFAULT_SLIDES;
  const [currentIndex, setCurrentIndex] = useState(0);
  const prevIndexRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prev => {
        prevIndexRef.current = prev;
        return (prev + 1) % activeSlides.length;
      });
    }, ADVANCE_INTERVAL);
    return () => clearInterval(timer);
  }, [activeSlides.length]);

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const slide = activeSlides[currentIndex];
  const prevSlide = activeSlides[prevIndexRef.current];

  return (
    <div
      className="kiosk-screensaver"
      onClick={handleDismiss}
      onTouchStart={handleDismiss}
      role="button"
      tabIndex={0}
      aria-label="Touchez pour commencer"
    >
      {/* Previous slide stays visible behind as static background */}
      <div className="absolute inset-0">
        <SlideLayer slide={prevSlide} primaryColor={primaryColor} />
      </div>

      {/* Current slide fades in on top */}
      <AnimatePresence>
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <SlideLayer slide={slide} primaryColor={primaryColor} />
        </motion.div>
      </AnimatePresence>

      {/* Tap hint animation */}
      <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3 z-20">
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
          Touchez l'écran
        </motion.p>
      </div>
    </div>
  );
}
