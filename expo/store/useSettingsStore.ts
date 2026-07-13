import { create } from 'zustand';
import { Platform } from 'react-native';
import { trackAccountEvent } from '@/lib/analytics';
import { recordError, logCrashlytics } from '@/lib/crashlytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { callAuthenticatedFunction } from '@/services/functionsApi';
import { logOutRevenueCat } from '@/lib/revenuecat';
import { signOutFromAuth } from '@/lib/auth';
import { exportUserData } from '@/services/dataExport';

export interface SettingsState {
  // Appearance
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  
  // Notifications
  pushNotifications: boolean;
  emailNotifications: boolean;
  
  // Account
  linkedAccounts: {
    apple: boolean;
    google: boolean;
  };
  
  // Privacy
  dataExportInProgress: boolean;
  
  // Actions
  updateTheme: (theme: 'light' | 'dark' | 'system') => void;
  updateFontSize: (size: number) => void;
  updatePushNotifications: (enabled: boolean) => void;
  updateEmailNotifications: (enabled: boolean) => void;
  updateLinkedAccount: (provider: 'apple' | 'google', connected: boolean) => void;
  exportData: () => Promise<void>;
  importData: (data: any) => Promise<void>;
  deleteAccount: () => Promise<void>;
  
  // Persistence
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

const defaultSettings = {
  theme: 'system' as const,
  fontSize: 1.0,
  pushNotifications: true,
  emailNotifications: true,
  linkedAccounts: {
    apple: true, // Mock as connected
    google: false, // Mock as not connected
  },
  dataExportInProgress: false,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...defaultSettings,

  updateTheme: (theme) => {
    set({ theme });
    get().saveSettings();
  },

  updateFontSize: (fontSize) => {
    set({ fontSize });
    get().saveSettings();
  },

  updatePushNotifications: (pushNotifications) => {
    set({ pushNotifications });
    get().saveSettings();
    
    // In a real app, you would register/unregister for push notifications here
    if (Platform.OS !== 'web') {
      console.log('Push notifications:', pushNotifications ? 'enabled' : 'disabled');
    }
  },

  updateEmailNotifications: (emailNotifications) => {
    set({ emailNotifications });
    get().saveSettings();
    
    // In a real app, you would update server-side notification preferences
    console.log('Email notifications:', emailNotifications ? 'enabled' : 'disabled');
  },

  updateLinkedAccount: (provider, connected) => {
    set((state) => ({
      linkedAccounts: {
        ...state.linkedAccounts,
        [provider]: connected,
      },
    }));
    get().saveSettings();
  },

  exportData: async () => {
    set({ dataExportInProgress: true });
    
    try {
      await exportUserData();
      
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    } finally {
      set({ dataExportInProgress: false });
    }
  },

  importData: async (data) => {
    try {
      // In a real app, you would:
      // 1. Validate the imported data structure
      // 2. Merge with existing data or replace
      // 3. Update Supabase
      
      if (data && typeof data === 'object') {
        console.log('Importing data:', data);
      }
      
      // Simulate import process
      await new Promise(resolve => {
        if (resolve) {
          setTimeout(resolve, 1500);
        }
      });
      
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  },

  deleteAccount: async () => {
    try {
      logCrashlytics('Account deletion initiated');
      await trackAccountEvent('account_deleted');

      await callAuthenticatedFunction<{ ok: boolean }>('deleteAccount');
      await logOutRevenueCat();
      await AsyncStorage.removeItem('draft:settings');
      await signOutFromAuth();
    } catch (error) {
      console.error('Account deletion failed:', error);
      recordError(error instanceof Error ? error : new Error('Account deletion failed'), 'account:delete');
      throw error;
    }
  },

  loadSettings: async () => {
    try {
      const stored = await AsyncStorage.getItem('draft:settings');
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<typeof defaultSettings>;
      set({
        ...defaultSettings,
        ...parsed,
        linkedAccounts: {
          ...defaultSettings.linkedAccounts,
          ...parsed.linkedAccounts,
        },
        dataExportInProgress: false,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  saveSettings: async () => {
    try {
      const { 
        theme, 
        fontSize, 
        pushNotifications, 
        emailNotifications, 
        linkedAccounts
      } = get();
      
      const settings = {
        theme,
        fontSize,
        pushNotifications,
        emailNotifications,
        linkedAccounts,
      };
      await AsyncStorage.setItem('draft:settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },
}));
