import { create } from 'zustand';
import { Platform } from 'react-native';

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
  
  // Subscription
  currentPlan: 'free' | 'premium' | 'premium+';
  
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
  currentPlan: 'free' as const,
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
      // Simulate export process
      await new Promise(resolve => {
        if (resolve) {
          setTimeout(resolve, 2000);
        }
      });
      
      // In a real app, you would:
      // 1. Fetch all user data from Supabase
      // 2. Format it as JSON
      // 3. Create a downloadable file or send via email
      
      const mockData = {
        bookmarks: [],
        projects: [],
        notes: [],
        exportedAt: new Date().toISOString(),
      };
      
      console.log('Data exported:', mockData);
      
      // For web, you could create a download link
      if (Platform.OS === 'web') {
        const dataStr = JSON.stringify(mockData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `pinnedly-export-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
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
      // In a real app, you would:
      // 1. Require re-authentication
      // 2. Delete all user data from Supabase
      // 3. Anonymize any shared data
      // 4. Sign out the user
      
      console.log('Account deletion initiated');
      
      // Simulate deletion process
      await new Promise(resolve => {
        if (resolve) {
          setTimeout(resolve, 3000);
        }
      });
      
      // Clear local storage would be done here
      console.log('Local storage cleared');
      
    } catch (error) {
      console.error('Account deletion failed:', error);
      throw error;
    }
  },

  loadSettings: async () => {
    try {
      // In a real app, you would load from AsyncStorage or Supabase
      console.log('Loading settings from storage');
      // Mock loading settings
      set({ ...defaultSettings });
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
        linkedAccounts, 
        currentPlan 
      } = get();
      
      const settings = {
        theme,
        fontSize,
        pushNotifications,
        emailNotifications,
        linkedAccounts,
        currentPlan,
      };
      
      // In a real app, you would save to AsyncStorage or Supabase
      console.log('Saving settings:', settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },
}));