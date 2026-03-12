import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInactivityOptions {
  timeout: number; // seconds
  onInactive: () => void;
  onActive?: () => void;
  enabled?: boolean;
}

interface UseInactivityResult {
  isInactive: boolean;
  resetTimer: () => void;
}

const EVENTS: (keyof DocumentEventMap)[] = ['pointerdown', 'pointermove', 'touchstart', 'keydown', 'scroll'];

export function useInactivity({ timeout, onInactive, onActive, enabled = true }: UseInactivityOptions): UseInactivityResult {
  const [isInactive, setIsInactive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onInactiveRef = useRef(onInactive);
  const onActiveRef = useRef(onActive);

  onInactiveRef.current = onInactive;
  onActiveRef.current = onActive;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    if (!enabled) return;
    timerRef.current = setTimeout(() => {
      setIsInactive(true);
      onInactiveRef.current();
    }, timeout * 1000);
  }, [timeout, enabled, clearTimer]);

  const resetTimer = useCallback(() => {
    if (isInactive) {
      setIsInactive(false);
      onActiveRef.current?.();
    }
    startTimer();
  }, [isInactive, startTimer]);

  useEffect(() => {
    if (!enabled) {
      clearTimer();
      setIsInactive(false);
      return;
    }

    startTimer();

    const handler = () => resetTimer();
    EVENTS.forEach(e => document.addEventListener(e, handler, { passive: true }));

    return () => {
      clearTimer();
      EVENTS.forEach(e => document.removeEventListener(e, handler));
    };
  }, [enabled, startTimer, resetTimer, clearTimer]);

  return { isInactive, resetTimer };
}
