import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { EntityShare, ShareRequest, SharePermission, ID } from '@/types';
import { COLLECTIONS, requireUserId, serverTimestamp, timestampToMillis } from '@/lib/firestore';

class SharingRepository {
  async shareEntity(request: ShareRequest, currentUserId: ID): Promise<EntityShare> {
    const users = await firestore()
      .collection(COLLECTIONS.users)
      .where('handle', '==', request.userEmail.trim().toLowerCase())
      .limit(1)
      .get();

    if (users.empty) throw new Error('User not found');
    const targetUser = users.docs[0];

    const existing = await firestore()
      .collection(COLLECTIONS.shares)
      .where('createdBy', '==', currentUserId)
      .where('entityId', '==', request.entityId)
      .where('entityType', '==', request.entityType)
      .where('toUserId', '==', targetUser.id)
      .limit(1)
      .get();

    if (!existing.empty) throw new Error('Entity already shared with this user');

    const ref = await firestore().collection(COLLECTIONS.shares).add({
      entityId: request.entityId,
      entityType: request.entityType,
      toUserId: targetUser.id,
      permission: request.permission,
      createdBy: currentUserId,
      createdAt: serverTimestamp(),
    });

    const created = await ref.get();
    return this.mapShare(created.id, created.data()!, targetUser.data());
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
    await ref.update({ permission });
    const updated = await ref.get();
    const userDoc = await firestore().collection(COLLECTIONS.users).doc(updated.data()!.toUserId).get();
    return this.mapShare(updated.id, updated.data()!, userDoc.data());
  }

  async revokeShare(shareId: ID): Promise<void> {
    requireUserId();
    await firestore().collection(COLLECTIONS.shares).doc(shareId).delete();
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