import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export type SyncStatus = {
  isOnline: boolean;
  lastSyncTime: number;
  pendingOperations: number;
  syncInProgress: boolean;
};

export function useSyncStatus(): SyncStatus {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? true);
    });
    return () => unsubscribe();
  }, []);

  return {
    isOnline,
    lastSyncTime: Date.now(),
    pendingOperations: 0,
    syncInProgress: false,
  };
}