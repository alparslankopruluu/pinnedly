import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import { ShareItem, ID } from '@/types';
import { socialRepository } from '@/repositories/SocialRepository';
import { useAuth } from './useAuthStore';

export const [SocialProvider, useSocial] = createContextHook(() => {
  const { user } = useAuth();
  const [unreadShareCount, setUnreadShareCount] = useState<number>(0);

  const followUser = useCallback(async (followingId: ID): Promise<void> => {
    if (!user) return;
    await socialRepository.followUser(user.id, followingId);
  }, [user]);

  const unfollowUser = useCallback(async (followingId: ID): Promise<void> => {
    if (!user) return;
    await socialRepository.unfollowUser(user.id, followingId);
  }, [user]);

  const isFollowing = useCallback(async (followingId: ID): Promise<boolean> => {
    if (!user) return false;
    return socialRepository.isFollowing(user.id, followingId);
  }, [user]);

  const getFollowers = useCallback(async (userId: ID): Promise<ID[]> => {
    return socialRepository.getFollowers(userId);
  }, []);

  const getFollowing = useCallback(async (userId: ID): Promise<ID[]> => {
    return socialRepository.getFollowing(userId);
  }, []);

  const shareItem = useCallback(async (
    toUserId: ID,
    itemType: 'bookmark' | 'note' | 'project',
    itemId: ID,
    message?: string
  ): Promise<void> => {
    if (!user) return;
    await socialRepository.shareItem(user.id, toUserId, itemType, itemId, message);
  }, [user]);

  const getSharedItems = useCallback(async (): Promise<ShareItem[]> => {
    if (!user) return [];
    return socialRepository.getSharedItems(user.id);
  }, [user]);

  const markShareAsRead = useCallback(async (shareId: ID): Promise<void> => {
    await socialRepository.markShareAsRead(shareId);
    if (user) {
      const count = await socialRepository.getUnreadShareCount(user.id);
      setUnreadShareCount(count);
    }
  }, [user]);

  const refreshUnreadCount = useCallback(async (): Promise<void> => {
    if (user) {
      const count = await socialRepository.getUnreadShareCount(user.id);
      setUnreadShareCount(count);
    }
  }, [user]);

  return useMemo(() => ({
    unreadShareCount,
    followUser,
    unfollowUser,
    isFollowing,
    getFollowers,
    getFollowing,
    shareItem,
    getSharedItems,
    markShareAsRead,
    refreshUnreadCount,
  }), [
    unreadShareCount,
    followUser,
    unfollowUser,
    isFollowing,
    getFollowers,
    getFollowing,
    shareItem,
    getSharedItems,
    markShareAsRead,
    refreshUnreadCount,
  ]);
});