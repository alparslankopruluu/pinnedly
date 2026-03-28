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
      window.addEventListener('online', async () => {
        this.isOnline = true;
        
        // Only sync if user is authenticated
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            this.processSyncQueue();
          }
        } catch (error) {
          console.warn('Auth check failed on network online:', error);
        }
        
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
    
    console.log(`Executing ${type} operation for ${table}:`, data.id);

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      switch (type) {
        case 'CREATE':
          const { error: createError } = await supabase.from(table).insert(data);
          if (createError) {
            console.error(`Create error for ${table}:`, {
              message: createError.message,
              details: createError.details,
              hint: createError.hint,
              code: createError.code
            });
            throw new Error(`Create failed: ${createError.message}`);
          }
          break;
        case 'UPDATE':
          const { error: updateError } = await supabase.from(table).update(data).eq('id', data.id);
          if (updateError) {
            console.error(`Update error for ${table}:`, {
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint,
              code: updateError.code
            });
            throw new Error(`Update failed: ${updateError.message}`);
          }
          break;
        case 'DELETE':
          const { error: deleteError } = await supabase.from(table).delete().eq('id', data.id);
          if (deleteError) {
            console.error(`Delete error for ${table}:`, {
              message: deleteError.message,
              details: deleteError.details,
              hint: deleteError.hint,
              code: deleteError.code
            });
            throw new Error(`Delete failed: ${deleteError.message}`);
          }
          break;
      }
      
      console.log(`Successfully executed ${type} operation for ${table}:`, data.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to execute ${type} operation for ${table}:`, errorMessage);
      throw new Error(`${type} operation failed: ${errorMessage}`);
    }
  }

  // Sync data from remote to local
  public async syncFromRemote(table: string, lastSyncTime?: number) {
    if (!this.isOnline) {
      console.log('Cannot sync from remote: offline');
      return;
    }

    try {
      console.log(`Starting sync from remote for table: ${table}`);
      
      // Check if user is authenticated first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn(`User not authenticated, skipping sync for ${table}`);
        return;
      }

      let query = supabase.from(table).select('*');
      
      if (lastSyncTime) {
        query = query.gte('updated_at', new Date(lastSyncTime).toISOString());
      }

      const { data, error } = await query;
      
      if (error) {
        console.error(`Supabase error for table ${table}:`, {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (data && data.length > 0) {
        // Store in local storage
        await AsyncStorage.setItem(`local_${table}`, JSON.stringify(data));
        
        console.log(`Synced ${data.length} records from ${table}`);
      } else {
        console.log(`No new records to sync for ${table}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to sync from remote ${table}:`, errorMessage);
      throw new Error(`Failed to sync from remote ${table}: ${errorMessage}`);
    }
  }

  // Get data with offline-first approach
  public async getData(table: string, useCache: boolean = true): Promise<any[]> {
    try {
      console.log(`Getting data for table: ${table}, online: ${this.isOnline}`);
      
      // If online, try to fetch from remote first
      if (this.isOnline) {
        try {
          // Check if user is authenticated first
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.warn(`User not authenticated, using local cache for ${table}`);
          } else {
            const { data, error } = await supabase.from(table).select('*');
            
            if (error) {
              console.warn(`Remote fetch error for ${table}:`, {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
              });
            } else if (data) {
              // Cache the data locally
              await AsyncStorage.setItem(`local_${table}`, JSON.stringify(data));
              console.log(`Fetched ${data.length} records from remote for ${table}`);
              return data;
            }
          }
        } catch (remoteError) {
          const errorMessage = remoteError instanceof Error ? remoteError.message : String(remoteError);
          console.warn(`Remote fetch failed for ${table}, falling back to local:`, errorMessage);
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

      console.log(`No data available for ${table}`);
      return [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to get data for ${table}:`, errorMessage);
      return [];
    }
  }

  // Create data with offline support
  public async createData(table: string, data: any) {
    try {
      console.log(`Creating data for table: ${table}`);
      
      // Always use test user for development
      const userId = 'test-user-123';
      
      const timestamp = Date.now();
      const dataWithTimestamp = {
        ...data,
        id: data.id || `temp_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        owner_id: data.owner_id || userId,
        created_at: new Date(timestamp).toISOString(),
        updated_at: new Date(timestamp).toISOString()
      };

      // Store locally immediately
      await this.updateLocalData(table, dataWithTimestamp, 'CREATE');

      // Queue for remote sync only if we have a real user
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id !== 'test-user-123') {
          await this.queueOperation({
            type: 'CREATE',
            table,
            data: { ...dataWithTimestamp, owner_id: user.id }
          });
        } else {
          console.log('Skipping remote sync for test user');
        }
      } catch (authError) {
        console.log('Auth check failed, skipping remote sync:', authError);
      }

      console.log(`Data created successfully for ${table}:`, dataWithTimestamp.id);
      return dataWithTimestamp;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to create data for ${table}:`, errorMessage);
      throw new Error(`Failed to create data for ${table}: ${errorMessage}`);
    }
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
    setInterval(async () => {
      if (this.isOnline && !this.syncInProgress) {
        // Check if user is authenticated before syncing
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            this.processSyncQueue();
          }
        } catch (error) {
          console.warn('Auth check failed during periodic sync:', error);
        }
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
    
    // Check if user is authenticated first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('User not authenticated, skipping force sync');
      return;
    }
    
    // Sync all tables
    const tables = ['projects', 'tasks', 'bookmarks', 'notes', 'bookmark_lists', 'profiles', 'project_members'];
    
    for (const table of tables) {
      try {
        await this.syncFromRemote(table);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to sync table ${table}:`, errorMessage);
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