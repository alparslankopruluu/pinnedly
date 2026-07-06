import { EntityInvite, SharePermission, ID } from '@/types';
import { shareApi } from '@/services/shareApi';

class InviteRepository {
  async createInvite(
    entityId: ID,
    entityType: EntityInvite['entityType'],
    permission: SharePermission
  ): Promise<EntityInvite> {
    return shareApi.createInvite(entityId, entityType, permission);
  }

  async getInviteByToken(_token: string): Promise<EntityInvite | null> {
    throw new Error('Invite lookup is only available through acceptInvite');
  }

  async acceptInvite(token: string): Promise<EntityInvite> {
    return shareApi.acceptInvite(token);
  }

  buildInviteUrl(token: string): string {
    return `draft://invite/${token}`;
  }
}

export const inviteRepository = new InviteRepository();
