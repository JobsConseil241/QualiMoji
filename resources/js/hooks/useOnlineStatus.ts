import { useState, useEffect, useCallback, useRef } from 'react';
import { getPendingCount } from '@/services/offlineStore';
import { syncPendingFeedbacks } from '@/services/syncService';

interface UseOnlineStatusResult {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  triggerSync: () => Promise<void>;
}

export function useOnlineStatus(): UseOnlineStatusResult {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB may not be available
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      await syncPendingFeedbacks();
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      await refreshCount();
    }
  }, [refreshCount]);

  // Listen for online/offline
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [triggerSync]);

  // Initial count + immediate sync if online (flush queued feedbacks after app restart)
  useEffect(() => {
    refreshCount();
    if (navigator.onLine) {
      triggerSync();
    }
  }, [refreshCount, triggerSync]);

  // Poll pending count every 30s
  useEffect(() => {
    const interval = setInterval(refreshCount, 30_000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  return { isOnline, isSyncing, pendingCount, triggerSync };
}
