import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { COLLECTIONS, requireUserId, serverTimestamp, timestampToMillis } from '@/lib/firestore';
import { EntityInvite, SharePermission, ID } from '@/types';
import { sharingRepository } from './SharingRepository';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function generateToken(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

class InviteRepository {
  async createInvite(
    entityId: ID,
    entityType: string,
    permission: SharePermission
  ): Promise<EntityInvite> {
    const uid = requireUserId();
    const token = generateToken();
    const expiresAt = Date.now() + INVITE_TTL_MS;

    const ref = await firestore().collection(COLLECTIONS.invites).add({
      token,
      entityId,
      entityType,
      permission,
      createdBy: uid,
      expiresAt,
      createdAt: serverTimestamp(),
    });

    const created = await ref.get();
    return this.mapInvite(created.id, created.data()!);
  }

  async getInviteByToken(token: string): Promise<EntityInvite | null> {
    const snapshot = await firestore()
      .collection(COLLECTIONS.invites)
      .where('token', '==', token)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return this.mapInvite(doc.id, doc.data());
  }

  async acceptInvite(token: string): Promise<EntityInvite> {
    const uid = requireUserId();
    const invite = await this.getInviteByToken(token);
    if (!invite) throw new Error('Invite not found');
    if (invite.expiresAt < Date.now()) throw new Error('Invite expired');
    if (invite.createdBy === uid) throw new Error('Cannot accept your own invite');

    try {
      await sharingRepository.shareEntityWithUser(
        invite.entityId,
        invite.entityType,
        uid,
        invite.permission,
        invite.createdBy
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!message.includes('already shared')) {
        throw error;
      }
    }

    return invite;
  }

  buildInviteUrl(token: string): string {
    return `draft://invite/${token}`;
  }

  private mapInvite(id: string, data: FirebaseFirestoreTypes.DocumentData): EntityInvite {
    return {
      id,
      token: data.token,
      entityId: data.entityId,
      entityType: data.entityType,
      permission: data.permission,
      createdBy: data.createdBy,
      expiresAt: data.expiresAt,
      createdAt: timestampToMillis(data.createdAt),
    };
  }
}

export const inviteRepository = new InviteRepository();