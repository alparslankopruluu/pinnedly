import { supabase } from '@/lib/supabase';
import { BookmarkList, ID } from '@/types';

class BookmarkListRepository {
  async createList(name: string, description?: string, isPublic: boolean = false): Promise<BookmarkList> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('bookmark_lists')
        .insert({
          name: name.trim(),
          description: description?.trim(),
          is_public: isPublic,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        isPublic: data.is_public,
        ownerId: data.owner_id,
        followerCount: data.follower_count,
        bookmarks: [],
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime(),
      };
    } catch (error) {
      console.error('Create list error:', error);
      throw error;
    }
  }

  async getMyLists(): Promise<BookmarkList[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('User not authenticated, returning empty lists');
        return [];
      }

      const { data, error } = await supabase
        .from('bookmark_lists')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error.message);
        if (error.message.includes('table') && error.message.includes('not found')) {
          console.log('Database tables not set up yet, returning empty lists');
          return [];
        }
        return [];
      }

      if (!data) return [];

      return data.map(list => ({
        id: list.id,
        name: list.name,
        description: list.description,
        isPublic: list.is_public,
        ownerId: list.owner_id,
        followerCount: list.follower_count,
        bookmarks: [],
        createdAt: new Date(list.created_at).getTime(),
        updatedAt: new Date(list.updated_at).getTime(),
      }));
    } catch (error) {
      console.error('Get my lists error:', error);
      return [];
    }
  }

  async getPublicLists(limit: number = 20): Promise<BookmarkList[]> {
    try {
      console.log('Attempting to fetch public lists...');
      
      const { data, error } = await supabase
        .from('bookmark_lists')
        .select('*')
        .eq('is_public', true)
        .order('follower_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Database error:', error.message, error.details, error.hint);
        if (error.message.includes('table') && error.message.includes('not found')) {
          console.log('Database tables not set up yet, returning empty lists');
          return [];
        }
        return [];
      }

      if (!data) {
        console.log('No data returned from query');
        return [];
      }

      console.log(`Successfully fetched ${data.length} public lists`);
      
      return data.map(list => ({
        id: list.id,
        name: list.name,
        description: list.description,
        isPublic: list.is_public,
        ownerId: list.owner_id,
        followerCount: list.follower_count,
        bookmarks: [],
        createdAt: new Date(list.created_at).getTime(),
        updatedAt: new Date(list.updated_at).getTime(),
      }));
    } catch (error) {
      console.error('Get public lists error:', error);
      return [];
    }
  }

  async getListById(id: ID): Promise<BookmarkList | null> {
    try {
      const { data, error } = await supabase
        .from('bookmark_lists')
        .select(`
          *,
          profiles!bookmark_lists_owner_id_fkey (
            handle,
            display_name,
            avatar_url
          )
        `)
        .eq('id', id)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        isPublic: data.is_public,
        ownerId: data.owner_id,
        followerCount: data.follower_count,
        bookmarks: [],
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime(),
      };
    } catch (error) {
      console.error('Get list by id error:', error);
      return null;
    }
  }

  async updateList(id: ID, updates: Partial<Pick<BookmarkList, 'name' | 'description' | 'isPublic'>>): Promise<BookmarkList> {
    try {
      const { data, error } = await supabase
        .from('bookmark_lists')
        .update({
          name: updates.name?.trim(),
          description: updates.description?.trim(),
          is_public: updates.isPublic,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        isPublic: data.is_public,
        ownerId: data.owner_id,
        followerCount: data.follower_count,
        bookmarks: [],
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime(),
      };
    } catch (error) {
      console.error('Update list error:', error);
      throw error;
    }
  }

  async deleteList(id: ID): Promise<void> {
    try {
      const { error } = await supabase
        .from('bookmark_lists')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Delete list error:', error);
      throw error;
    }
  }

  async followList(listId: ID): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('list_followers')
        .insert({
          list_id: listId,
          user_id: user.id,
        });

      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Follow list error:', error);
      throw error;
    }
  }

  async unfollowList(listId: ID): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('list_followers')
        .delete()
        .eq('list_id', listId)
        .eq('user_id', user.id);

      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Unfollow list error:', error);
      throw error;
    }
  }

  async isFollowingList(listId: ID): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('list_followers')
        .select('id')
        .eq('list_id', listId)
        .eq('user_id', user.id)
        .single();

      return !!data;
    } catch (error) {
      return false;
    }
  }

  async getFollowedLists(): Promise<BookmarkList[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('User not authenticated, returning empty followed lists');
        return [];
      }

      const { data, error } = await supabase
        .from('list_followers')
        .select(`
          bookmark_lists (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error.message);
        if (error.message.includes('table') && error.message.includes('not found')) {
          console.log('Database tables not set up yet, returning empty lists');
          return [];
        }
        return [];
      }

      if (!data) return [];

      return data
        .filter(item => item.bookmark_lists)
        .map(item => {
          const list = item.bookmark_lists as any;
          return {
            id: list.id,
            name: list.name,
            description: list.description,
            isPublic: list.is_public,
            ownerId: list.owner_id,
            followerCount: list.follower_count,
            bookmarks: [],
            createdAt: new Date(list.created_at).getTime(),
            updatedAt: new Date(list.updated_at).getTime(),
          };
        });
    } catch (error) {
      console.error('Get followed lists error:', error);
      return [];
    }
  }

  async searchPublicLists(query: string): Promise<BookmarkList[]> {
    if (!query.trim()) return [];

    try {
      const { data, error } = await supabase
        .from('bookmark_lists')
        .select('*')
        .eq('is_public', true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('follower_count', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Database error:', error.message);
        return [];
      }

      if (!data) return [];

      return data.map(list => ({
        id: list.id,
        name: list.name,
        description: list.description,
        isPublic: list.is_public,
        ownerId: list.owner_id,
        followerCount: list.follower_count,
        bookmarks: [],
        createdAt: new Date(list.created_at).getTime(),
        updatedAt: new Date(list.updated_at).getTime(),
      }));
    } catch (error) {
      console.error('Search public lists error:', error);
      return [];
    }
  }
}

export const bookmarkListRepository = new BookmarkListRepository();