import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { EntityShare, ShareRequest, SharePermission, ID } from '@/types';
import { COLLECTIONS, requireUserId, serverTimestamp, timestampToMillis } from '@/lib/firestore';
import { entityAccessRepository } from './EntityAccessRepository';

class SharingRepository {
  async shareEntity(request: ShareRequest, currentUserId: ID): Promise<EntityShare> {
    let targetUserId = request.targetUserId;

    if (!targetUserId) {
      const handle = request.userEmail.trim().toLowerCase().replace(/^@/, '');
      const users = await firestore()
        .collection(COLLECTIONS.users)
        .where('handle', '==', handle)
        .limit(1)
        .get();

      if (users.empty) throw new Error('User not found');
      targetUserId = users.docs[0].id;
    }

    return this.shareEntityWithUser(
      request.entityId,
      request.entityType,
      targetUserId,
      request.permission,
      currentUserId
    );
  }

  async shareEntityWithUser(
    entityId: ID,
    entityType: string,
    targetUserId: ID,
    permission: SharePermission,
    currentUserId: ID
  ): Promise<EntityShare> {
    if (targetUserId === currentUserId) {
      throw new Error('Cannot share with yourself');
    }

    const existing = await firestore()
      .collection(COLLECTIONS.shares)
      .where('createdBy', '==', currentUserId)
      .where('entityId', '==', entityId)
      .where('entityType', '==', entityType)
      .where('toUserId', '==', targetUserId)
      .limit(1)
      .get();

    if (!existing.empty) throw new Error('Entity already shared with this user');

    const ref = await firestore().collection(COLLECTIONS.shares).add({
      entityId,
      entityType,
      toUserId: targetUserId,
      permission,
      createdBy: currentUserId,
      createdAt: serverTimestamp(),
    });

    await entityAccessRepository.grantAccess(entityType, entityId, targetUserId, permission);

    const created = await ref.get();
    const userDoc = await firestore().collection(COLLECTIONS.users).doc(targetUserId).get();
    return this.mapShare(created.id, created.data()!, userDoc.data());
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
    requireUserId();
    const ref = firestore().collection(COLLECTIONS.shares).doc(shareId);
    const before = await ref.get();
    if (!before.exists()) throw new Error('Share not found');

    const data = before.data()!;
    await ref.update({ permission });
    await entityAccessRepository.updateAccessPermission(
      data.entityType,
      data.entityId,
      data.toUserId,
      permission
    );

    const updated = await ref.get();
    const userDoc = await firestore().collection(COLLECTIONS.users).doc(updated.data()!.toUserId).get();
    return this.mapShare(updated.id, updated.data()!, userDoc.data());
  }

  async revokeShare(shareId: ID): Promise<void> {
    requireUserId();
    const ref = firestore().collection(COLLECTIONS.shares).doc(shareId);
    const doc = await ref.get();
    if (!doc.exists()) return;

    const data = doc.data()!;
    await ref.delete();
    await entityAccessRepository.revokeAccess(data.entityType, data.entityId, data.toUserId);
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