import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAutoResetOptions {
  seconds: number;
  onReset: () => void;
  pauseOnTouch?: boolean;
}

interface UseAutoResetResult {
  remaining: number;
  progress: number; // 0-100
  isPaused: boolean;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export function useAutoReset({ seconds, onReset, pauseOnTouch = false }: UseAutoResetOptions): UseAutoResetResult {
  const [remaining, setRemaining] = useState(seconds);
  const [isPaused, setIsPaused] = useState(false);
  const onResetRef = useRef(onReset);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  onResetRef.current = onReset;

  // Countdown interval
  useEffect(() => {
    if (isPaused) return;
    if (remaining <= 0) {
      onResetRef.current();
      return;
    }
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, remaining]);

  // Pause on touch
  useEffect(() => {
    if (!pauseOnTouch) return;

    const handler = () => {
      setIsPaused(true);
      setRemaining(seconds); // reset countdown
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = setTimeout(() => setIsPaused(false), 2000);
    };

    document.addEventListener('pointerdown', handler, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', handler);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, [pauseOnTouch, seconds]);

  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);
  const reset = useCallback(() => {
    setRemaining(seconds);
    setIsPaused(false);
  }, [seconds]);

  const progress = seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 100;

  return { remaining, progress, isPaused, pause, resume, reset };
}
