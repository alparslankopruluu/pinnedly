import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';
import React from 'react';

// Types for sync operations
export type SyncOperation = {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
  userId?: string;
};

export type SyncStatus = {
  isOnline: boolean;
  lastSyncTime: number;
  pendingOperations: number;
  syncInProgress: boolean;
};

export type ConflictResolution = 'local' | 'remote' | 'merge';

class SyncEngine {
  private syncQueue: SyncOperation[] = [];
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private listeners: ((status: SyncStatus) => void)[] = [];
  private encryptionKey: string = 'your-encryption-key-here'; // Should be from secure storage

  constructor() {
    this.initializeNetworkListener();
    this.loadSyncQueue();
    this.startPeriodicSync();
  }

  // Initialize network connectivity listener
  private initializeNetworkListener() {
    if (Platform.OS === 'web') {
      // Web fallback
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processSyncQueue();
        this.notifyListeners();
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyListeners();
      });
      
      this.isOnline = navigator.onLine;
    } else {
      // For mobile, we'll use a simple approach
      this.isOnline = true;
    }
  }

  // Load sync queue from local storage
  private async loadSyncQueue() {
    try {
      const queueData = await AsyncStorage.getItem('sync_queue');
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
        console.log(`Loaded ${this.syncQueue.length} operations from sync queue`);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }

  // Save sync queue to local storage
  private async saveSyncQueue() {
    try {
      await AsyncStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  // Add operation to sync queue
  public async queueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>) {
    const syncOp: SyncOperation = {
      ...operation,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.syncQueue.push(syncOp);
    await this.saveSyncQueue();
    
    console.log(`Queued ${operation.type} operation for ${operation.table}`);
    
    // If online, try to process immediately
    if (this.isOnline) {
      this.processSyncQueue();
    }
    
    this.notifyListeners();
  }

  // Process sync queue
  public async processSyncQueue() {
    if (!this.isOnline || this.syncInProgress || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    this.notifyListeners();

    console.log(`Processing ${this.syncQueue.length} sync operations`);

    const processedOperations: string[] = [];
    
    for (const operation of this.syncQueue) {
      try {
        await this.executeOperation(operation);
        processedOperations.push(operation.id);
        console.log(`Successfully synced operation ${operation.id}`);
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);
        
        // Increment retry count
        operation.retryCount++;
        
        // Remove operation if max retries exceeded
        if (operation.retryCount >= 3) {
          console.warn(`Removing operation ${operation.id} after 3 failed attempts`);
          processedOperations.push(operation.id);
        }
      }
    }

    // Remove processed operations from queue
    this.syncQueue = this.syncQueue.filter(op => !processedOperations.includes(op.id));
    await this.saveSyncQueue();
    
    // Update last sync time
    await AsyncStorage.setItem('last_sync_time', Date.now().toString());
    
    this.syncInProgress = false;
    this.notifyListeners();
  }

  // Execute individual sync operation
  private async executeOperation(operation: SyncOperation) {
    const { type, table, data } = operation;

    switch (type) {
      case 'CREATE':
        const { error: createError } = await supabase.from(table).insert(data);
        if (createError) throw createError;
        break;
      case 'UPDATE':
        const { error: updateError } = await supabase.from(table).update(data).eq('id', data.id);
        if (updateError) throw updateError;
        break;
      case 'DELETE':
        const { error: deleteError } = await supabase.from(table).delete().eq('id', data.id);
        if (deleteError) throw deleteError;
        break;
    }
  }

  // Sync data from remote to local
  public async syncFromRemote(table: string, lastSyncTime?: number) {
    if (!this.isOnline) {
      console.log('Cannot sync from remote: offline');
      return;
    }

    try {
      let query = supabase.from(table).select('*');
      
      if (lastSyncTime) {
        query = query.gte('updated_at', new Date(lastSyncTime).toISOString());
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Store in local storage
        await AsyncStorage.setItem(`local_${table}`, JSON.stringify(data));
        
        console.log(`Synced ${data.length} records from ${table}`);
      }
    } catch (error) {
      console.error(`Failed to sync from remote ${table}:`, error);
      throw error;
    }
  }

  // Get data with offline-first approach
  public async getData(table: string, useCache: boolean = true): Promise<any[]> {
    try {
      // If online, try to fetch from remote first
      if (this.isOnline) {
        try {
          const { data, error } = await supabase.from(table).select('*');
          
          if (!error && data) {
            // Cache the data locally
            await AsyncStorage.setItem(`local_${table}`, JSON.stringify(data));
            return data;
          }
        } catch (remoteError) {
          console.warn(`Remote fetch failed for ${table}, falling back to local:`, remoteError);
        }
      }

      // Fallback to local storage
      if (useCache) {
        const localData = await AsyncStorage.getItem(`local_${table}`);
        if (localData) {
          const parsedData = JSON.parse(localData);
          console.log(`Serving ${parsedData.length} records from local cache for ${table}`);
          return parsedData;
        }
      }

      return [];
    } catch (error) {
      console.error(`Failed to get data for ${table}:`, error);
      return [];
    }
  }

  // Create data with offline support
  public async createData(table: string, data: any) {
    const timestamp = Date.now();
    const dataWithTimestamp = {
      ...data,
      id: data.id || `temp_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date(timestamp).toISOString(),
      updated_at: new Date(timestamp).toISOString()
    };

    // Store locally immediately
    await this.updateLocalData(table, dataWithTimestamp, 'CREATE');

    // Queue for remote sync
    await this.queueOperation({
      type: 'CREATE',
      table,
      data: dataWithTimestamp
    });

    return dataWithTimestamp;
  }

  // Update data with offline support
  public async updateData(table: string, id: string, updates: any) {
    const timestamp = Date.now();
    const dataWithTimestamp = {
      ...updates,
      id,
      updated_at: new Date(timestamp).toISOString()
    };

    // Update locally immediately
    await this.updateLocalData(table, dataWithTimestamp, 'UPDATE');

    // Queue for remote sync
    await this.queueOperation({
      type: 'UPDATE',
      table,
      data: dataWithTimestamp
    });

    return dataWithTimestamp;
  }

  // Delete data with offline support
  public async deleteData(table: string, id: string) {
    // Remove from local storage
    await this.updateLocalData(table, { id }, 'DELETE');

    // Queue for remote sync
    await this.queueOperation({
      type: 'DELETE',
      table,
      data: { id }
    });
  }

  // Update local data storage
  private async updateLocalData(table: string, data: any, operation: 'CREATE' | 'UPDATE' | 'DELETE') {
    try {
      const localData = await AsyncStorage.getItem(`local_${table}`);
      let records: any[] = [];
      
      if (localData) {
        records = JSON.parse(localData);
      }

      switch (operation) {
        case 'CREATE':
          records.push(data);
          break;
        case 'UPDATE':
          const updateIndex = records.findIndex(r => r.id === data.id);
          if (updateIndex >= 0) {
            records[updateIndex] = { ...records[updateIndex], ...data };
          }
          break;
        case 'DELETE':
          records = records.filter(r => r.id !== data.id);
          break;
      }

      await AsyncStorage.setItem(`local_${table}`, JSON.stringify(records));
    } catch (error) {
      console.error(`Failed to update local data for ${table}:`, error);
    }
  }

  // Resolve conflicts using last-write-wins strategy
  public async resolveConflicts(table: string, localData: any, remoteData: any): Promise<any> {
    // Simple last-write-wins based on updated_at timestamp
    const localTime = new Date(localData.updated_at).getTime();
    const remoteTime = new Date(remoteData.updated_at).getTime();
    
    if (localTime > remoteTime) {
      console.log(`Conflict resolved: keeping local version for ${table}:${localData.id}`);
      return localData;
    } else {
      console.log(`Conflict resolved: keeping remote version for ${table}:${remoteData.id}`);
      return remoteData;
    }
  }

  // Start periodic sync (every 30 seconds when online)
  private startPeriodicSync() {
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.processSyncQueue();
      }
    }, 30000);
  }

  // Get current sync status
  public getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      lastSyncTime: 0, // Will be loaded from AsyncStorage
      pendingOperations: this.syncQueue.length,
      syncInProgress: this.syncInProgress
    };
  }

  // Subscribe to sync status changes
  public onSyncStatusChange(callback: (status: SyncStatus) => void) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners of status changes
  private notifyListeners() {
    const status = this.getSyncStatus();
    this.listeners.forEach(listener => listener(status));
  }

  // Force full sync
  public async forceSync() {
    if (!this.isOnline) {
      throw new Error('Cannot force sync while offline');
    }

    console.log('Starting force sync...');
    
    // Sync all tables
    const tables = ['projects', 'tasks', 'bookmarks', 'notes', 'bookmark_lists'];
    
    for (const table of tables) {
      try {
        await this.syncFromRemote(table);
      } catch (error) {
        console.error(`Failed to sync table ${table}:`, error);
      }
    }

    // Process pending operations
    await this.processSyncQueue();
    
    console.log('Force sync completed');
  }

  // Clear all local data (for logout)
  public async clearLocalData() {
    const tables = ['projects', 'tasks', 'bookmarks', 'notes', 'bookmark_lists'];
    
    for (const table of tables) {
      await AsyncStorage.removeItem(`local_${table}`);
    }
    
    this.syncQueue = [];
    await this.saveSyncQueue();
    
    console.log('Local data cleared');
  }
}

// Export singleton instance
export const syncEngine = new SyncEngine();

// Export utility functions for React components
export const useSyncStatus = () => {
  const [status, setStatus] = React.useState<SyncStatus>(syncEngine.getSyncStatus());
  
  React.useEffect(() => {
    const unsubscribe = syncEngine.onSyncStatusChange(setStatus);
    return unsubscribe;
  }, []);
  
  return status;
};

// React hook for offline-first data fetching
export const useOfflineData = (table: string) => {
  const [data, setData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const result = await syncEngine.getData(table);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [table]);
  
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { data, loading, error, refetch: fetchData };
};