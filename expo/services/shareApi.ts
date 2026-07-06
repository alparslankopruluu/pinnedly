import auth from '@react-native-firebase/auth';
import Constants from 'expo-constants';
import { EntityInvite, EntityShare, SharePermission, User } from '@/types';

type ShareEntityInput = {
  entityId: string;
  entityType: 'note' | 'bookmark' | 'list' | 'project';
  userEmail?: string;
  handle?: string;
  targetUserId?: string;
  permission: SharePermission;
};

type UpdateProfileInput = {
  displayName: string;
  handle: string;
  bio?: string;
  avatar?: string;
};

type ProjectMemberInput = {
  projectId: string;
  userId: string;
  permission?: SharePermission;
};

export class ShareApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string
  ) {
    super(message);
    this.name = 'ShareApiError';
  }
}

function getFunctionsBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { functionsBaseUrl?: string } | undefined;
  return (extra?.functionsBaseUrl ?? 'https://europe-west1-pinnedly-48c49.cloudfunctions.net')
    .replace(/\/$/, '');
}

async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const user = auth().currentUser;
  if (!user) throw new ShareApiError('User not authenticated', 401, 'AUTH_REQUIRED');

  const token = await user.getIdToken();
  const response = await fetch(`${getFunctionsBaseUrl()}/${name}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) as {
      error?: string;
      code?: string;
    };
    throw new ShareApiError(
      errorBody.error || 'Request failed',
      response.status,
      errorBody.code
    );
  }

  return response.json() as Promise<T>;
}

export const shareApi = {
  createInvite(entityId: string, entityType: ShareEntityInput['entityType'], permission: SharePermission) {
    return callFunction<EntityInvite & { inviteUrl?: string }>('createInvite', {
      entityId,
      entityType,
      permission,
    });
  },

  acceptInvite(token: string) {
    return callFunction<EntityInvite>('acceptInvite', { token });
  },

  shareEntityWithHandle(input: ShareEntityInput) {
    return callFunction<EntityShare>('shareEntityWithHandle', input);
  },

  updateSharePermission(shareId: string, permission: SharePermission) {
    return callFunction<EntityShare>('updateSharePermission', { shareId, permission });
  },

  revokeShare(shareId: string) {
    return callFunction<{ ok: boolean }>('revokeShare', { shareId });
  },

  updateProjectMemberPermission({ projectId, userId, permission }: ProjectMemberInput & { permission: SharePermission }) {
    return callFunction<EntityShare>('updateProjectMemberPermission', {
      projectId,
      userId,
      permission,
    });
  },

  removeProjectMember({ projectId, userId }: ProjectMemberInput) {
    return callFunction<{ ok: boolean }>('removeProjectMember', { projectId, userId });
  },

  updateProfile(input: UpdateProfileInput) {
    return callFunction<User>('updateProfile', input);
  },
};
