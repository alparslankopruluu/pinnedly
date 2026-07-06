import * as admin from 'firebase-admin';
import { randomBytes, createHash } from 'crypto';
import { onRequest } from 'firebase-functions/v2/https';

type EntityType = 'note' | 'bookmark' | 'project' | 'list';
type SharePermission = 'view' | 'edit';

type RequestLike = {
  method: string;
  headers: {
    authorization?: string;
  };
  body?: unknown;
};

type ResponseLike = {
  set: (key: string, value: string) => void;
  status: (code: number) => ResponseLike;
  json: (body: unknown) => void;
  send: (body: string) => void;
};

type UserProfile = {
  id: string;
  handle: string;
  email: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  isVerified?: boolean;
  followerCount: number;
  followingCount: number;
  createdAt: number;
};

const REGION = 'europe-west1';
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const HANDLE_PATTERN = /^[a-z0-9_]{3,30}$/;

const ENTITY_COLLECTIONS: Record<EntityType, string> = {
  note: 'notes',
  bookmark: 'bookmarks',
  project: 'projects',
  list: 'bookmarkLists',
};

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string = message
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function setCors(res: ResponseLike): void {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

function getBody(req: RequestLike): Record<string, unknown> {
  return req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
}

async function requireAuth(req: RequestLike): Promise<string> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Missing authorization token', 'AUTH_REQUIRED');
  }

  try {
    const decoded = await admin.auth().verifyIdToken(authHeader.slice(7));
    return decoded.uid;
  } catch {
    throw new HttpError(401, 'Invalid authorization token', 'AUTH_REQUIRED');
  }
}

function httpEndpoint(
  handler: (uid: string, body: Record<string, unknown>) => Promise<unknown>
) {
  return onRequest({ region: REGION, cors: true }, async (req, res) => {
    const response = res as ResponseLike;
    setCors(response);

    if (req.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
      return;
    }

    try {
      const uid = await requireAuth(req as RequestLike);
      const result = await handler(uid, getBody(req as RequestLike));
      response.status(200).json(result);
    } catch (error) {
      if (error instanceof HttpError) {
        response.status(error.status).json({ error: error.message, code: error.code });
        return;
      }

      console.error('share endpoint failed:', error);
      response.status(500).json({ error: 'Internal server error', code: 'INTERNAL' });
    }
  });
}

function readRequiredString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${key} is required`, 'INVALID_ARGUMENT');
  }
  return value.trim();
}

function readOptionalString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  return typeof value === 'string' ? value.trim() : undefined;
}

function readEntityType(body: Record<string, unknown>): EntityType {
  const value = readRequiredString(body, 'entityType');
  if (!(value in ENTITY_COLLECTIONS)) {
    throw new HttpError(400, 'Invalid entity type', 'INVALID_ENTITY_TYPE');
  }
  return value as EntityType;
}

function readPermission(body: Record<string, unknown>): SharePermission {
  const value = readRequiredString(body, 'permission');
  if (value !== 'view' && value !== 'edit') {
    throw new HttpError(400, 'Invalid permission', 'INVALID_PERMISSION');
  }
  return value;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function timestampToMillis(value: unknown): number {
  if (typeof value === 'number') return value;
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis: () => number }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

function mapUser(id: string, data: admin.firestore.DocumentData | undefined): UserProfile | undefined {
  if (!data) return undefined;
  return {
    id,
    handle: typeof data.handle === 'string' ? data.handle : '',
    email: typeof data.email === 'string' ? data.email : '',
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    avatar: typeof data.avatar === 'string' ? data.avatar : undefined,
    bio: typeof data.bio === 'string' ? data.bio : undefined,
    isVerified: data.isVerified === true,
    followerCount: typeof data.followerCount === 'number' ? data.followerCount : 0,
    followingCount: typeof data.followingCount === 'number' ? data.followingCount : 0,
    createdAt: timestampToMillis(data.createdAt),
  };
}

function shareIdFor(entityType: EntityType, entityId: string, targetUserId: string): string {
  return createHash('sha256')
    .update(`${entityType}:${entityId}:${targetUserId}`)
    .digest('hex')
    .slice(0, 40);
}

function projectMemberIdFor(projectId: string, userId: string): string {
  return createHash('sha256')
    .update(`project-member:${projectId}:${userId}`)
    .digest('hex')
    .slice(0, 40);
}

function canManageEntity(data: admin.firestore.DocumentData, uid: string): boolean {
  return data.ownerId === uid || toStringArray(data.editors).includes(uid);
}

function accessUpdatesForGrant(
  entityType: EntityType,
  data: admin.firestore.DocumentData,
  targetUserId: string,
  permission: SharePermission
): Record<string, unknown> {
  const sharedWith = Array.from(new Set([...toStringArray(data.sharedWith), targetUserId]));
  const editors = toStringArray(data.editors).filter((id) => id !== targetUserId);
  if (permission === 'edit') editors.push(targetUserId);

  const updates: Record<string, unknown> = {
    sharedWith,
    editors: Array.from(new Set(editors)),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const isPublic = data.visibility === 'public' || data.isPublic === true;
  if (!isPublic) {
    updates.visibility = 'shared';
    if (entityType === 'list') updates.isPublic = false;
  }

  return updates;
}

function accessUpdatesForRevoke(
  entityType: EntityType,
  data: admin.firestore.DocumentData,
  targetUserId: string
): Record<string, unknown> {
  const sharedWith = toStringArray(data.sharedWith).filter((id) => id !== targetUserId);
  const editors = toStringArray(data.editors).filter((id) => id !== targetUserId);
  const updates: Record<string, unknown> = {
    sharedWith,
    editors,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (sharedWith.length === 0 && data.visibility === 'shared') {
    updates.visibility = 'private';
    if (entityType === 'list') updates.isPublic = false;
  }

  return updates;
}

async function findTargetUser(
  body: Record<string, unknown>
): Promise<admin.firestore.QueryDocumentSnapshot | admin.firestore.DocumentSnapshot> {
  const db = admin.firestore();
  const explicitUserId = readOptionalString(body, 'targetUserId');
  if (explicitUserId) {
    const doc = await db.collection('users').doc(explicitUserId).get();
    if (!doc.exists) throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
    return doc;
  }

  const rawHandle = readOptionalString(body, 'handle') ?? readOptionalString(body, 'userEmail');
  if (!rawHandle) throw new HttpError(400, 'Target user is required', 'INVALID_ARGUMENT');

  const normalized = rawHandle.replace(/^@/, '').trim().toLowerCase();
  const byHandle = await db.collection('users').where('handle', '==', normalized).limit(1).get();
  if (!byHandle.empty) return byHandle.docs[0];

  if (normalized.includes('@')) {
    const byEmail = await db.collection('users').where('email', '==', normalized).limit(1).get();
    if (!byEmail.empty) return byEmail.docs[0];
  }

  throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
}

async function syncListBookmarkAccess(
  listId: string,
  targetUserId: string,
  permission: SharePermission | null
): Promise<void> {
  const db = admin.firestore();
  const listSnap = await db.collection('bookmarkLists').doc(listId).get();
  if (!listSnap.exists) return;

  const listData = listSnap.data() ?? {};
  const bookmarkIds = toStringArray(listData.bookmarkIds);
  for (const bookmarkId of bookmarkIds) {
    const bookmarkRef = db.collection('bookmarks').doc(bookmarkId);
    const bookmarkSnap = await bookmarkRef.get();
    if (!bookmarkSnap.exists) continue;

    const bookmarkData = bookmarkSnap.data() ?? {};
    if (bookmarkData.ownerId !== listData.ownerId) continue;

    if (permission) {
      await bookmarkRef.update(accessUpdatesForGrant('bookmark', bookmarkData, targetUserId, permission));
      continue;
    }

    const directShareRef = db.collection('shares').doc(shareIdFor('bookmark', bookmarkId, targetUserId));
    const directShareSnap = await directShareRef.get();
    if (!directShareSnap.exists) {
      await bookmarkRef.update(accessUpdatesForRevoke('bookmark', bookmarkData, targetUserId));
    }
  }
}

async function writeProjectMember(
  tx: admin.firestore.Transaction,
  projectId: string,
  targetUserId: string,
  actorId: string,
  permission: SharePermission
): Promise<void> {
  const memberRef = admin
    .firestore()
    .collection('projectMembers')
    .doc(projectMemberIdFor(projectId, targetUserId));
  tx.set(
    memberRef,
    {
      projectId,
      userId: targetUserId,
      role: permission === 'edit' ? 'editor' : 'viewer',
      permission,
      invitedBy: actorId,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function grantEntityAccess(
  actorId: string,
  entityType: EntityType,
  entityId: string,
  targetUserId: string,
  permission: SharePermission
): Promise<string> {
  if (actorId === targetUserId) {
    throw new HttpError(400, 'Cannot share with yourself', 'CANNOT_SHARE_WITH_SELF');
  }

  const db = admin.firestore();
  const entityRef = db.collection(ENTITY_COLLECTIONS[entityType]).doc(entityId);
  const shareRef = db.collection('shares').doc(shareIdFor(entityType, entityId, targetUserId));

  await db.runTransaction(async (tx) => {
    const entitySnap = await tx.get(entityRef);
    if (!entitySnap.exists) throw new HttpError(404, 'Entity not found', 'ENTITY_NOT_FOUND');

    const entityData = entitySnap.data() ?? {};
    if (!canManageEntity(entityData, actorId)) {
      throw new HttpError(403, 'You do not have permission to share this entity', 'PERMISSION_DENIED');
    }

    if (entityData.ownerId === targetUserId) {
      throw new HttpError(400, 'Cannot share with the owner', 'CANNOT_SHARE_WITH_OWNER');
    }

    const existingShareSnap = await tx.get(shareRef);
    tx.update(entityRef, accessUpdatesForGrant(entityType, entityData, targetUserId, permission));
    tx.set(
      shareRef,
      {
        entityId,
        entityType,
        toUserId: targetUserId,
        permission,
        createdBy: existingShareSnap.exists ? existingShareSnap.data()?.createdBy ?? actorId : actorId,
        createdAt: existingShareSnap.exists
          ? existingShareSnap.data()?.createdAt ?? admin.firestore.FieldValue.serverTimestamp()
          : admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (entityType === 'project') {
      await writeProjectMember(tx, entityId, targetUserId, actorId, permission);
    }
  });

  if (entityType === 'list') {
    await syncListBookmarkAccess(entityId, targetUserId, permission);
  }

  return shareRef.id;
}

async function revokeEntityAccess(actorId: string, shareId: string): Promise<void> {
  const db = admin.firestore();
  const shareRef = db.collection('shares').doc(shareId);
  let revokedListId: string | null = null;
  let revokedListTargetUserId: string | null = null;

  await db.runTransaction(async (tx) => {
    const shareSnap = await tx.get(shareRef);
    if (!shareSnap.exists) return;

    const shareData = shareSnap.data() ?? {};
    const entityType = shareData.entityType as EntityType;
    if (!(entityType in ENTITY_COLLECTIONS)) {
      throw new HttpError(400, 'Invalid entity type', 'INVALID_ENTITY_TYPE');
    }

    const entityId = String(shareData.entityId ?? '');
    const targetUserId = String(shareData.toUserId ?? '');
    const entityRef = db.collection(ENTITY_COLLECTIONS[entityType]).doc(entityId);
    const entitySnap = await tx.get(entityRef);
    if (!entitySnap.exists) {
      tx.delete(shareRef);
      return;
    }

    const entityData = entitySnap.data() ?? {};
    if (!canManageEntity(entityData, actorId)) {
      throw new HttpError(403, 'You do not have permission to update this share', 'PERMISSION_DENIED');
    }

    tx.update(entityRef, accessUpdatesForRevoke(entityType, entityData, targetUserId));
    tx.delete(shareRef);

    if (entityType === 'project') {
      tx.delete(db.collection('projectMembers').doc(projectMemberIdFor(entityId, targetUserId)));
    } else if (entityType === 'list') {
      revokedListId = entityId;
      revokedListTargetUserId = targetUserId;
    }
  });

  if (revokedListId && revokedListTargetUserId) {
    await syncListBookmarkAccess(revokedListId, revokedListTargetUserId, null);
  }
}

async function shareResponse(shareId: string): Promise<Record<string, unknown>> {
  const db = admin.firestore();
  const shareSnap = await db.collection('shares').doc(shareId).get();
  if (!shareSnap.exists) throw new HttpError(404, 'Share not found', 'SHARE_NOT_FOUND');

  const shareData = shareSnap.data() ?? {};
  const userSnap = await db.collection('users').doc(String(shareData.toUserId)).get();
  return {
    id: shareSnap.id,
    entityId: shareData.entityId,
    entityType: shareData.entityType,
    userId: shareData.toUserId,
    permission: shareData.permission,
    createdBy: shareData.createdBy,
    createdAt: timestampToMillis(shareData.createdAt),
    user: mapUser(userSnap.id, userSnap.data()),
  };
}

function inviteResponse(id: string, data: admin.firestore.DocumentData): Record<string, unknown> {
  return {
    id,
    token: data.token,
    entityId: data.entityId,
    entityType: data.entityType,
    permission: data.permission,
    createdBy: data.createdBy,
    expiresAt: data.expiresAt,
    createdAt: timestampToMillis(data.createdAt),
    inviteUrl: `draft://invite/${data.token}`,
  };
}

export const createInvite = httpEndpoint(async (uid, body) => {
  const entityType = readEntityType(body);
  const entityId = readRequiredString(body, 'entityId');
  const permission = readPermission(body);
  const db = admin.firestore();
  const token = randomBytes(24).toString('base64url');
  const inviteRef = db.collection('invites').doc(token);
  const entityRef = db.collection(ENTITY_COLLECTIONS[entityType]).doc(entityId);
  const expiresAt = Date.now() + INVITE_TTL_MS;

  await db.runTransaction(async (tx) => {
    const entitySnap = await tx.get(entityRef);
    if (!entitySnap.exists) throw new HttpError(404, 'Entity not found', 'ENTITY_NOT_FOUND');

    if (!canManageEntity(entitySnap.data() ?? {}, uid)) {
      throw new HttpError(403, 'You do not have permission to invite people', 'PERMISSION_DENIED');
    }

    tx.set(inviteRef, {
      token,
      entityId,
      entityType,
      permission,
      createdBy: uid,
      expiresAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  const created = await inviteRef.get();
  return inviteResponse(created.id, created.data() ?? {});
});

export const acceptInvite = httpEndpoint(async (uid, body) => {
  const token = readRequiredString(body, 'token');
  const inviteRef = admin.firestore().collection('invites').doc(token);
  const inviteSnap = await inviteRef.get();

  if (!inviteSnap.exists) throw new HttpError(404, 'Invite not found', 'INVITE_NOT_FOUND');
  const inviteData = inviteSnap.data() ?? {};
  if (typeof inviteData.expiresAt !== 'number' || inviteData.expiresAt < Date.now()) {
    throw new HttpError(410, 'Invite expired', 'INVITE_EXPIRED');
  }
  if (inviteData.createdBy === uid) {
    throw new HttpError(400, 'Cannot accept your own invite', 'CANNOT_ACCEPT_OWN_INVITE');
  }

  const entityType = inviteData.entityType as EntityType;
  if (!(entityType in ENTITY_COLLECTIONS)) {
    throw new HttpError(400, 'Invalid invite', 'INVALID_INVITE');
  }

  await grantEntityAccess(
    String(inviteData.createdBy),
    entityType,
    String(inviteData.entityId),
    uid,
    inviteData.permission === 'edit' ? 'edit' : 'view'
  );

  return inviteResponse(inviteSnap.id, inviteData);
});

export const shareEntityWithHandle = httpEndpoint(async (uid, body) => {
  const entityType = readEntityType(body);
  const entityId = readRequiredString(body, 'entityId');
  const permission = readPermission(body);
  const targetUser = await findTargetUser(body);
  const shareId = await grantEntityAccess(uid, entityType, entityId, targetUser.id, permission);
  return shareResponse(shareId);
});

export const updateSharePermission = httpEndpoint(async (uid, body) => {
  const shareId = readRequiredString(body, 'shareId');
  const permission = readPermission(body);
  const db = admin.firestore();
  const shareRef = db.collection('shares').doc(shareId);

  await db.runTransaction(async (tx) => {
    const shareSnap = await tx.get(shareRef);
    if (!shareSnap.exists) throw new HttpError(404, 'Share not found', 'SHARE_NOT_FOUND');

    const shareData = shareSnap.data() ?? {};
    const entityType = shareData.entityType as EntityType;
    if (!(entityType in ENTITY_COLLECTIONS)) {
      throw new HttpError(400, 'Invalid entity type', 'INVALID_ENTITY_TYPE');
    }

    const entityRef = db.collection(ENTITY_COLLECTIONS[entityType]).doc(String(shareData.entityId));
    const entitySnap = await tx.get(entityRef);
    if (!entitySnap.exists) throw new HttpError(404, 'Entity not found', 'ENTITY_NOT_FOUND');

    const entityData = entitySnap.data() ?? {};
    if (!canManageEntity(entityData, uid)) {
      throw new HttpError(403, 'You do not have permission to update this share', 'PERMISSION_DENIED');
    }

    tx.update(
      entityRef,
      accessUpdatesForGrant(entityType, entityData, String(shareData.toUserId), permission)
    );
    tx.update(shareRef, {
      permission,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (entityType === 'project') {
      await writeProjectMember(tx, String(shareData.entityId), String(shareData.toUserId), uid, permission);
    }
  });

  const updatedShareSnap = await shareRef.get();
  const updatedShareData = updatedShareSnap.data();
  if (updatedShareData?.entityType === 'list') {
    await syncListBookmarkAccess(
      String(updatedShareData.entityId),
      String(updatedShareData.toUserId),
      permission
    );
  }

  return shareResponse(shareId);
});

export const revokeShare = httpEndpoint(async (uid, body) => {
  const shareId = readRequiredString(body, 'shareId');
  await revokeEntityAccess(uid, shareId);
  return { ok: true };
});

export const updateProjectMemberPermission = httpEndpoint(async (uid, body) => {
  const projectId = readRequiredString(body, 'projectId');
  const userId = readRequiredString(body, 'userId');
  const permission = readPermission(body);
  const shareId = shareIdFor('project', projectId, userId);
  const db = admin.firestore();
  const shareRef = db.collection('shares').doc(shareId);

  await db.runTransaction(async (tx) => {
    const projectRef = db.collection('projects').doc(projectId);
    const projectSnap = await tx.get(projectRef);
    if (!projectSnap.exists) throw new HttpError(404, 'Project not found', 'ENTITY_NOT_FOUND');

    const projectData = projectSnap.data() ?? {};
    if (!canManageEntity(projectData, uid)) {
      throw new HttpError(403, 'You do not have permission to update this member', 'PERMISSION_DENIED');
    }
    if (projectData.ownerId === userId) {
      throw new HttpError(400, 'Cannot update the project owner', 'CANNOT_UPDATE_OWNER');
    }

    tx.update(projectRef, accessUpdatesForGrant('project', projectData, userId, permission));
    tx.set(shareRef, {
      entityId: projectId,
      entityType: 'project',
      toUserId: userId,
      createdBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      permission,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    await writeProjectMember(tx, projectId, userId, uid, permission);
  });

  return shareResponse(shareId);
});

export const removeProjectMember = httpEndpoint(async (uid, body) => {
  const projectId = readRequiredString(body, 'projectId');
  const userId = readRequiredString(body, 'userId');
  const db = admin.firestore();
  const projectRef = db.collection('projects').doc(projectId);
  const shareRef = db.collection('shares').doc(shareIdFor('project', projectId, userId));
  const memberRef = db.collection('projectMembers').doc(projectMemberIdFor(projectId, userId));

  await db.runTransaction(async (tx) => {
    const projectSnap = await tx.get(projectRef);
    if (!projectSnap.exists) throw new HttpError(404, 'Project not found', 'ENTITY_NOT_FOUND');

    const projectData = projectSnap.data() ?? {};
    if (!canManageEntity(projectData, uid)) {
      throw new HttpError(403, 'You do not have permission to remove this member', 'PERMISSION_DENIED');
    }
    if (projectData.ownerId === userId) {
      throw new HttpError(400, 'Cannot remove the project owner', 'CANNOT_REMOVE_OWNER');
    }

    tx.update(projectRef, accessUpdatesForRevoke('project', projectData, userId));
    tx.delete(shareRef);
    tx.delete(memberRef);
  });

  return { ok: true };
});

export const updateProfile = httpEndpoint(async (uid, body) => {
  const displayName = readRequiredString(body, 'displayName').slice(0, 80);
  const handle = readRequiredString(body, 'handle').replace(/^@/, '').toLowerCase();
  const bio = readOptionalString(body, 'bio');
  const avatar = readOptionalString(body, 'avatar');

  if (!HANDLE_PATTERN.test(handle)) {
    throw new HttpError(400, 'Invalid handle', 'INVALID_HANDLE');
  }
  if (bio && bio.length > 160) {
    throw new HttpError(400, 'Bio is too long', 'BIO_TOO_LONG');
  }
  if (avatar && avatar.length > 2048) {
    throw new HttpError(400, 'Avatar URL is too long', 'AVATAR_TOO_LONG');
  }

  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);
  const handleRef = db.collection('handleReservations').doc(handle);

  await db.runTransaction(async (tx) => {
    const [userSnap, reservedHandleSnap, sameHandleUsers] = await Promise.all([
      tx.get(userRef),
      tx.get(handleRef),
      tx.get(db.collection('users').where('handle', '==', handle).limit(2)),
    ]);

    if (!userSnap.exists) throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');

    const existingOwner = reservedHandleSnap.exists ? reservedHandleSnap.data()?.userId : undefined;
    if (existingOwner && existingOwner !== uid) {
      throw new HttpError(409, 'Handle already taken', 'HANDLE_TAKEN');
    }

    const conflictingUser = sameHandleUsers.docs.find((doc) => doc.id !== uid);
    if (conflictingUser) {
      throw new HttpError(409, 'Handle already taken', 'HANDLE_TAKEN');
    }

    const oldHandle = userSnap.data()?.handle;
    if (typeof oldHandle === 'string' && oldHandle && oldHandle !== handle) {
      const oldHandleRef = db.collection('handleReservations').doc(oldHandle);
      const oldHandleSnap = await tx.get(oldHandleRef);
      if (oldHandleSnap.exists && oldHandleSnap.data()?.userId === uid) {
        tx.delete(oldHandleRef);
      }
    }

    tx.set(
      handleRef,
      {
        userId: uid,
        handle,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    tx.update(userRef, {
      displayName,
      handle,
      bio: bio || null,
      avatar: avatar || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  const updated = await userRef.get();
  const user = mapUser(updated.id, updated.data());
  if (!user) throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
  return user;
});
