import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://fpdkpvzzduqnswrkdogd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZGtwdnp6ZHVxbnN3cmtkb2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MjM4MzksImV4cCI6MjA3MjQ5OTgzOX0.Hi8e1WebrWiFRI1xUv7OxYWpVxQIPFPPCewlED3QZyk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          handle: string;
          display_name: string;
          avatar_url?: string;
          bio?: string;
          is_verified: boolean;
          follower_count: number;
          following_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          handle: string;
          display_name: string;
          avatar_url?: string;
          bio?: string;
          is_verified?: boolean;
          follower_count?: number;
          following_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          handle?: string;
          display_name?: string;
          avatar_url?: string;
          bio?: string;
          is_verified?: boolean;
          follower_count?: number;
          following_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      shares: {
        Row: {
          id: string;
          entity_id: string;
          entity_type: 'note' | 'bookmark' | 'list' | 'project';
          user_id: string;
          permission: 'view' | 'edit';
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_id: string;
          entity_type: 'note' | 'bookmark' | 'list' | 'project';
          user_id: string;
          permission: 'view' | 'edit';
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          entity_id?: string;
          entity_type?: 'note' | 'bookmark' | 'list' | 'project';
          user_id?: string;
          permission?: 'view' | 'edit';
          created_by?: string;
          created_at?: string;
        };
      };
    };
  };
};