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
    
    // Test basic connection
    const { error: connectionError } = await supabase
      .from('bookmark_lists')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('Database connection failed:', connectionError);
      
      // If it's a schema cache issue, try to refresh
      if (connectionError.message.includes('schema cache') || connectionError.message.includes('not found')) {
        console.log('Attempting to refresh schema cache...');
        
        // Try to refresh the session which might help with schema cache
        await supabase.auth.refreshSession();
        
        // Wait a bit and try again
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { error: retryError } = await supabase
          .from('bookmark_lists')
          .select('count')
          .limit(1);
          
        if (retryError) {
          console.error('Database still not accessible after refresh:', retryError);
          return false;
        }
      } else {
        return false;
      }
    }
    
    console.log('Database connection successful');
    
    // Try to create some sample public lists if none exist
    await createSampleDataIfNeeded();
    
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
};

// Create sample data if the database is empty
const createSampleDataIfNeeded = async () => {
  try {
    // Check if there are any public lists
    const { data: existingLists, error } = await supabase
      .from('bookmark_lists')
      .select('id')
      .eq('is_public', true)
      .limit(1);
    
    if (error) {
      console.log('Could not check for existing lists:', error.message);
      return;
    }
    
    if (existingLists && existingLists.length > 0) {
      console.log('Sample data already exists');
      return;
    }
    
    console.log('Creating sample public lists...');
    
    // Create a few sample public lists (without authentication for now)
    const sampleLists = [
      {
        name: 'Tech Resources',
        description: 'Useful development tools and resources',
        is_public: true,
        owner_id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
        follower_count: 15
      },
      {
        name: 'Design Inspiration',
        description: 'Beautiful designs and UI patterns',
        is_public: true,
        owner_id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
        follower_count: 8
      },
      {
        name: 'Learning Materials',
        description: 'Educational content and tutorials',
        is_public: true,
        owner_id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
        follower_count: 23
      }
    ];
    
    for (const list of sampleLists) {
      const { error: insertError } = await supabase
        .from('bookmark_lists')
        .insert(list);
      
      if (insertError) {
        console.log('Could not create sample list:', insertError.message);
      }
    }
    
    console.log('Sample data created successfully');
  } catch (error) {
    console.log('Error creating sample data:', error);
  }
};

// Test database connection
export const testDatabaseConnection = async () => {
  try {
    console.log('Testing database connection...');
    
    // Test with a simple query that should always work
    const { error } = await supabase
      .from('bookmark_lists')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
    
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