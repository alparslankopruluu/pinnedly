import { supabase } from '@/lib/supabase';
import { EntityShare, ShareRequest, SharePermission, ID, User } from '@/types';

class SharingRepository {
  async shareEntity(request: ShareRequest, currentUserId: ID): Promise<EntityShare> {
    try {
      // First, find the user by email
      const { data: profiles, error: searchError } = await supabase
        .from('profiles')
        .select('*')
        .or(`handle.ilike.%${request.userEmail}%,display_name.ilike.%${request.userEmail}%`)
        .limit(1);

      if (searchError || !profiles || profiles.length === 0) {
        throw new Error('User not found');
      }

      const targetUser = profiles[0];

      // Check if already shared
      const { data: existingShare } = await supabase
        .from('shares')
        .select('*')
        .eq('entity_id', request.entityId)
        .eq('entity_type', request.entityType)
        .eq('user_id', targetUser.id)
        .single();

      if (existingShare) {
        throw new Error('Entity already shared with this user');
      }

      // Create the share
      const { data, error } = await supabase
        .from('shares')
        .insert({
          entity_id: request.entityId,
          entity_type: request.entityType,
          user_id: targetUser.id,
          permission: request.permission,
          created_by: currentUserId,
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        id: data.id,
        entityId: data.entity_id,
        entityType: data.entity_type as 'note' | 'bookmark' | 'list' | 'project',
        userId: data.user_id,
        permission: data.permission as SharePermission,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at).getTime(),
        user: {
          id: targetUser.id,
          handle: targetUser.handle,
          email: '',
          displayName: targetUser.display_name,
          avatar: targetUser.avatar_url,
          bio: targetUser.bio,
          isVerified: targetUser.is_verified,
          followerCount: targetUser.follower_count,
          followingCount: targetUser.following_count,
          createdAt: new Date(targetUser.created_at).getTime(),
        },
      };
    } catch (error) {
      console.error('Share entity error:', error);
      throw error;
    }
  }

  async getEntityShares(entityId: ID, entityType: string): Promise<EntityShare[]> {
    try {
      const { data, error } = await supabase
        .from('shares')
        .select(`
          *,
          profiles!shares_user_id_fkey (
            id,
            handle,
            display_name,
            avatar_url,
            bio,
            is_verified,
            follower_count,
            following_count,
            created_at
          )
        `)
        .eq('entity_id', entityId)
        .eq('entity_type', entityType);

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map(share => ({
        id: share.id,
        entityId: share.entity_id,
        entityType: share.entity_type as 'note' | 'bookmark' | 'list' | 'project',
        userId: share.user_id,
        permission: share.permission as SharePermission,
        createdBy: share.created_by,
        createdAt: new Date(share.created_at).getTime(),
        user: share.profiles ? {
          id: share.profiles.id,
          handle: share.profiles.handle,
          email: '',
          displayName: share.profiles.display_name,
          avatar: share.profiles.avatar_url,
          bio: share.profiles.bio,
          isVerified: share.profiles.is_verified,
          followerCount: share.profiles.follower_count,
          followingCount: share.profiles.following_count,
          createdAt: new Date(share.profiles.created_at).getTime(),
        } : undefined,
      }));
    } catch (error) {
      console.error('Get entity shares error:', error);
      return [];
    }
  }

  async updateSharePermission(shareId: ID, permission: SharePermission): Promise<void> {
    try {
      const { error } = await supabase
        .from('shares')
        .update({ permission })
        .eq('id', shareId);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Update share permission error:', error);
      throw error;
    }
  }

  async removeShare(shareId: ID): Promise<void> {
    try {
      const { error } = await supabase
        .from('shares')
        .delete()
        .eq('id', shareId);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Remove share error:', error);
      throw error;
    }
  }

  async getUserShares(userId: ID): Promise<EntityShare[]> {
    try {
      const { data, error } = await supabase
        .from('shares')
        .select(`
          *,
          profiles!shares_created_by_fkey (
            id,
            handle,
            display_name,
            avatar_url,
            bio,
            is_verified,
            follower_count,
            following_count,
            created_at
          )
        `)
        .eq('user_id', userId);

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map(share => ({
        id: share.id,
        entityId: share.entity_id,
        entityType: share.entity_type as 'note' | 'bookmark' | 'list' | 'project',
        userId: share.user_id,
        permission: share.permission as SharePermission,
        createdBy: share.created_by,
        createdAt: new Date(share.created_at).getTime(),
        user: share.profiles ? {
          id: share.profiles.id,
          handle: share.profiles.handle,
          email: '',
          displayName: share.profiles.display_name,
          avatar: share.profiles.avatar_url,
          bio: share.profiles.bio,
          isVerified: share.profiles.is_verified,
          followerCount: share.profiles.follower_count,
          followingCount: share.profiles.following_count,
          createdAt: new Date(share.profiles.created_at).getTime(),
        } : undefined,
      }));
    } catch (error) {
      console.error('Get user shares error:', error);
      return [];
    }
  }

  async checkPermission(entityId: ID, entityType: string, userId: ID): Promise<SharePermission | null> {
    try {
      const { data, error } = await supabase
        .from('shares')
        .select('permission')
        .eq('entity_id', entityId)
        .eq('entity_type', entityType)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return data.permission as SharePermission;
    } catch (error) {
      console.error('Check permission error:', error);
      return null;
    }
  }
}

export const sharingRepository = new SharingRepository();