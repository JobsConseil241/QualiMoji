import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OfflineBadgeProps {
  pendingCount?: number;
  isSyncing?: boolean;
}

export default function OfflineBadge({ pendingCount = 0, isSyncing = false }: OfflineBadgeProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const shouldShow = !isOnline || isSyncing || pendingCount > 0;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-4 right-4 z-50"
        >
          {!isOnline ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-orange-500 text-white text-sm font-medium shadow-lg">
              <WifiOff className="h-4 w-4" />
              Hors ligne
            </div>
          ) : isSyncing ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-500 text-white text-sm font-medium shadow-lg">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Synchronisation...
            </div>
          ) : pendingCount > 0 ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-yellow-500 text-white text-sm font-medium shadow-lg">
              {pendingCount} en attente
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
