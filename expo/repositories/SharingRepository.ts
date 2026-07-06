import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { EntityShare, ShareRequest, SharePermission, ID } from '@/types';
import { COLLECTIONS, requireUserId, timestampToMillis } from '@/lib/firestore';
import { shareApi } from '@/services/shareApi';

class SharingRepository {
  async shareEntity(request: ShareRequest, currentUserId: ID): Promise<EntityShare> {
    return this.shareEntityWithUser(
      request.entityId,
      request.entityType,
      request.targetUserId,
      request.permission,
      currentUserId,
      request.userEmail
    );
  }

  async shareEntityWithUser(
    entityId: ID,
    entityType: EntityShare['entityType'],
    targetUserId: ID | undefined,
    permission: SharePermission,
    currentUserId: ID,
    userEmail?: string
  ): Promise<EntityShare> {
    if (targetUserId === currentUserId) {
      throw new Error('Cannot share with yourself');
    }

    return shareApi.shareEntityWithHandle({
      entityId,
      entityType,
      targetUserId,
      userEmail,
      permission,
    });
  }

  async getEntityShares(entityId: ID, entityType: string): Promise<EntityShare[]> {
    const uid = requireUserId();
    const snapshot = await firestore()
      .collection(COLLECTIONS.shares)
      .where('createdBy', '==', uid)
      .where('entityId', '==', entityId)
      .where('entityType', '==', entityType)
      .get();

    const shares: EntityShare[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const userDoc = await firestore().collection(COLLECTIONS.users).doc(data.toUserId).get();
      shares.push(this.mapShare(doc.id, data, userDoc.data()));
    }
    return shares;
  }

  async getReceivedShares(userId: ID): Promise<EntityShare[]> {
    const snapshot = await firestore()
      .collection(COLLECTIONS.shares)
      .where('toUserId', '==', userId)
      .get();

    const shares: EntityShare[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const creator = await firestore().collection(COLLECTIONS.users).doc(data.createdBy).get();
      shares.push(this.mapShare(doc.id, data, creator.data()));
    }
    return shares;
  }

  async updateSharePermission(shareId: ID, permission: SharePermission): Promise<EntityShare> {
    return shareApi.updateSharePermission(shareId, permission);
  }

  async revokeShare(shareId: ID): Promise<void> {
    await shareApi.revokeShare(shareId);
  }

  async removeShare(shareId: ID): Promise<void> {
    return this.revokeShare(shareId);
  }

  async getUserShares(userId: ID): Promise<EntityShare[]> {
    return this.getReceivedShares(userId);
  }

  async checkPermission(
    entityId: ID,
    entityType: string,
    userId: ID
  ): Promise<SharePermission | null> {
    const snapshot = await firestore()
      .collection(COLLECTIONS.shares)
      .where('entityId', '==', entityId)
      .where('entityType', '==', entityType)
      .where('toUserId', '==', userId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return snapshot.docs[0].data().permission as SharePermission;
  }

  private mapShare(
    id: string,
    data: FirebaseFirestoreTypes.DocumentData,
    profile?: FirebaseFirestoreTypes.DocumentData
  ): EntityShare {
    return {
      id,
      entityId: data.entityId,
      entityType: data.entityType,
      userId: data.toUserId,
      permission: data.permission,
      createdBy: data.createdBy,
      createdAt: timestampToMillis(data.createdAt),
      user: profile
        ? {
            id: data.toUserId,
            handle: profile.handle,
            email: profile.email || '',
            displayName: profile.displayName,
            avatar: profile.avatar,
            bio: profile.bio,
            isVerified: profile.isVerified,
            followerCount: profile.followerCount ?? 0,
            followingCount: profile.followingCount ?? 0,
            createdAt: timestampToMillis(profile.createdAt),
          }
        : undefined,
    };
  }
}

export const sharingRepository = new SharingRepository();
