import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import { EntityShare, ShareRequest, SharePermission, ID } from '@/types';
import { sharingRepository } from '@/repositories/SharingRepository';
import { useAuth } from './useAuthStore';

export const [SharingProvider, useSharing] = createContextHook(() => {
  const { user } = useAuth();
  const [shares, setShares] = useState<Record<string, EntityShare[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const shareEntity = useCallback(async (request: ShareRequest): Promise<EntityShare> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    try {
      const share = await sharingRepository.shareEntity(request, user.id);
      
      // Update local state
      const key = `${request.entityType}:${request.entityId}`;
      setShares(prev => ({
        ...prev,
        [key]: [...(prev[key] || []), share],
      }));

      return share;
    } catch (error) {
      console.error('Share entity error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const getEntityShares = useCallback(async (entityId: ID, entityType: string): Promise<EntityShare[]> => {
    const key = `${entityType}:${entityId}`;
    
    // Return cached if available
    if (shares[key]) {
      return shares[key];
    }

    setIsLoading(true);
    try {
      const entityShares = await sharingRepository.getEntityShares(entityId, entityType);
      
      setShares(prev => ({
        ...prev,
        [key]: entityShares,
      }));

      return entityShares;
    } catch (error) {
      console.error('Get entity shares error:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [shares]);

  const updateSharePermission = useCallback(async (shareId: ID, permission: SharePermission, entityId: ID, entityType: string): Promise<void> => {
    setIsLoading(true);
    try {
      await sharingRepository.updateSharePermission(shareId, permission);
      
      // Update local state
      const key = `${entityType}:${entityId}`;
      setShares(prev => ({
        ...prev,
        [key]: (prev[key] || []).map(share => 
          share.id === shareId ? { ...share, permission } : share
        ),
      }));
    } catch (error) {
      console.error('Update share permission error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeShare = useCallback(async (shareId: ID, entityId: ID, entityType: string): Promise<void> => {
    setIsLoading(true);
    try {
      await sharingRepository.removeShare(shareId);
      
      // Update local state
      const key = `${entityType}:${entityId}`;
      setShares(prev => ({
        ...prev,
        [key]: (prev[key] || []).filter(share => share.id !== shareId),
      }));
    } catch (error) {
      console.error('Remove share error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUserShares = useCallback(async (): Promise<EntityShare[]> => {
    if (!user) {
      return [];
    }

    setIsLoading(true);
    try {
      return await sharingRepository.getUserShares(user.id);
    } catch (error) {
      console.error('Get user shares error:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const checkPermission = useCallback(async (entityId: ID, entityType: string): Promise<SharePermission | null> => {
    if (!user) {
      return null;
    }

    try {
      return await sharingRepository.checkPermission(entityId, entityType, user.id);
    } catch (error) {
      console.error('Check permission error:', error);
      return null;
    }
  }, [user]);

  const hasEditPermission = useCallback((entityId: ID, entityType: string, ownerId?: ID): boolean => {
    if (!user) return false;
    
    // Owner always has edit permission
    if (ownerId && user.id === ownerId) return true;
    
    // Check shared permissions (this would need to be cached or fetched)
    const key = `${entityType}:${entityId}`;
    const entityShares = shares[key] || [];
    const userShare = entityShares.find(share => share.userId === user.id);
    
    return userShare?.permission === 'edit';
  }, [user, shares]);

  const hasViewPermission = useCallback((entityId: ID, entityType: string, ownerId?: ID): boolean => {
    if (!user) return false;
    
    // Owner always has view permission
    if (ownerId && user.id === ownerId) return true;
    
    // Check shared permissions
    const key = `${entityType}:${entityId}`;
    const entityShares = shares[key] || [];
    const userShare = entityShares.find(share => share.userId === user.id);
    
    return userShare?.permission === 'view' || userShare?.permission === 'edit';
  }, [user, shares]);

  return useMemo(() => ({
    shares,
    isLoading,
    shareEntity,
    getEntityShares,
    updateSharePermission,
    removeShare,
    getUserShares,
    checkPermission,
    hasEditPermission,
    hasViewPermission,
  }), [
    shares,
    isLoading,
    shareEntity,
    getEntityShares,
    updateSharePermission,
    removeShare,
    getUserShares,
    checkPermission,
    hasEditPermission,
    hasViewPermission,
  ]);
});