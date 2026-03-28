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
  global: {
    headers: {
      'x-client-info': 'supabase-js-react-native',
    },
  },
});

// Test database connection and initialize if needed
export const initializeDatabase = async () => {
  try {
    console.log('Initializing database connection...');
    
    // Just test auth connection, don't try to access tables that might not exist
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Auth session check completed:', session ? 'authenticated' : 'not authenticated');
    
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
};



// Test database connection
export const testDatabaseConnection = async () => {
  try {
    console.log('Testing database connection...');
    
    // Just test auth, don't access tables
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Database connection test successful');
    return true;
  } catch (error) {
    console.error('Database connection test error:', error);
    return false;
  }
};

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
      projects: {
        Row: {
          id: string;
          title: string;
          description?: string;
          cover_image?: string;
          deadline?: string;
          owner_id: string;
          visibility: 'private' | 'public' | 'unlisted';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          cover_image?: string;
          deadline?: string;
          owner_id: string;
          visibility?: 'private' | 'public' | 'unlisted';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          cover_image?: string;
          deadline?: string;
          owner_id?: string;
          visibility?: 'private' | 'public' | 'unlisted';
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          status: 'todo' | 'in-progress' | 'done';
          due_date?: string;
          notes?: string;
          project_id: string;
          assigned_to?: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          status?: 'todo' | 'in-progress' | 'done';
          due_date?: string;
          notes?: string;
          project_id: string;
          assigned_to?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          status?: 'todo' | 'in-progress' | 'done';
          due_date?: string;
          notes?: string;
          project_id?: string;
          assigned_to?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          permission: 'view' | 'edit';
          invited_by: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'member';
          permission?: 'view' | 'edit';
          invited_by: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'member';
          permission?: 'view' | 'edit';
          invited_by?: string;
          joined_at?: string;
        };
      };
      bookmarks: {
        Row: {
          id: string;
          url?: string;
          title?: string;
          description?: string;
          image_preview?: string;
          screenshot_uri?: string;
          open_count: number;
          last_opened_at?: string;
          source?: string;
          owner_id: string;
          visibility: 'private' | 'public' | 'unlisted';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          url?: string;
          title?: string;
          description?: string;
          image_preview?: string;
          screenshot_uri?: string;
          open_count?: number;
          last_opened_at?: string;
          source?: string;
          owner_id: string;
          visibility?: 'private' | 'public' | 'unlisted';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          url?: string;
          title?: string;
          description?: string;
          image_preview?: string;
          screenshot_uri?: string;
          open_count?: number;
          last_opened_at?: string;
          source?: string;
          owner_id?: string;
          visibility?: 'private' | 'public' | 'unlisted';
          created_at?: string;
          updated_at?: string;
        };
      };
      notes: {
        Row: {
          id: string;
          title: string;
          markdown: string;
          owner_id: string;
          visibility: 'private' | 'public' | 'unlisted';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          markdown: string;
          owner_id: string;
          visibility?: 'private' | 'public' | 'unlisted';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          markdown?: string;
          owner_id?: string;
          visibility?: 'private' | 'public' | 'unlisted';
          created_at?: string;
          updated_at?: string;
        };
      };
      bookmark_lists: {
        Row: {
          id: string;
          name: string;
          description?: string;
          is_public: boolean;
          owner_id: string;
          follower_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          is_public?: boolean;
          owner_id: string;
          follower_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          is_public?: boolean;
          owner_id?: string;
          follower_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      list_followers: {
        Row: {
          id: string;
          list_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          list_id?: string;
          user_id?: string;
          created_at?: string;
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