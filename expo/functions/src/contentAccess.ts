import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { getAuthoritativeEntitlement, revenueCatApiKey } from './subscription';

type LimitedResource = 'bookmarks' | 'notes' | 'todos' | 'projects' | 'bookmarkLists';
type MutationAction = 'create' | 'delete' | 'createProjectTask' | 'deleteProjectTask';

const REGION = 'europe-west1';
const FREE_LIMITS: Record<LimitedResource, number> = {
  bookmarks: 30,
  notes: 10,
  todos: 20,
  projects: 2,
  bookmarkLists: 1,
};

const ALLOWED_CREATE_FIELDS: Record<LimitedResource, readonly string[]> = {
  bookmarks: [
    'url', 'title', 'description', 'imagePreview', 'screenshotUri', 'notes', 'tags', 'tagNames',
    'personalNote', 'status', 'reminderAt', 'readAt', 'openCount', 'lastOpenedAt', 'source',
    'visibility', 'category', 'reminderSchedule', 'sharedWith', 'editors',
  ],
  notes: [
    'title', 'markdown', 'coverImage', 'links', 'visibility', 'category', 'reminderSchedule',
    'sharedWith', 'editors',
  ],
  todos: [
    'title', 'description', 'completed', 'priority', 'dueDate', 'projectId', 'noteId', 'category',
    'reminderSchedule',
  ],
  projects: [
    'title', 'description', 'coverImage', 'gallery', 'deadline', 'visibility', 'sharedWith', 'editors',
  ],
  bookmarkLists: [
    'name', 'description', 'isPublic', 'visibility', 'sharedWith', 'editors', 'followerCount',
    'bookmarkIds',
  ],
};

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
  }
}

function pickAllowed(resource: LimitedResource, data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of ALLOWED_CREATE_FIELDS[resource]) {
    if (data[key] !== undefined) result[key] = normalizeValue(key, data[key]);
  }
  return result;
}

function normalizeValue(key: string, value: unknown): unknown {
  if (['deadline', 'dueDate', 'reminderAt', 'readAt', 'lastOpenedAt'].includes(key)) {
    if (value === null) return null;
    const date = new Date(value as string | number);
    if (Number.isNaN(date.getTime())) throw new ApiError(400, 'INVALID_ARGUMENT', `${key} is invalid`);
    return date;
  }
  return value;
}

async function requireAuth(req: { headers: { authorization?: string } }): Promise<string> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication required');
  try {
    return (await admin.auth().verifyIdToken(auth.slice(7))).uid;
  } catch {
    throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication required');
  }
}

function bodyRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object') throw new ApiError(400, 'INVALID_ARGUMENT', 'Body is required');
  return body as Record<string, unknown>;
}

function requiredString(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, 'INVALID_ARGUMENT', `${field} is required`);
  }
  return value.trim();
}

function resourceFromBody(body: Record<string, unknown>): LimitedResource {
  const value = requiredString(body, 'resource');
  if (!(value in FREE_LIMITS)) throw new ApiError(400, 'INVALID_ARGUMENT', 'Invalid resource');
  return value as LimitedResource;
}

async function createOwnedContent(
  uid: string,
  resource: LimitedResource,
  id: string,
  input: Record<string, unknown>
): Promise<void> {
  const db = admin.firestore();
  const entitlement = await getAuthoritativeEntitlement(uid);
  const resourceRef = db.collection(resource).doc(id);
  const usageRef = db.collection('subscriptionUsage').doc(uid);
  const payload = pickAllowed(resource, input);
  if (!entitlement.active) {
    if ('visibility' in payload) payload.visibility = 'private';
    if ('isPublic' in payload) payload.isPublic = false;
    if ('sharedWith' in payload) payload.sharedWith = [];
    if ('editors' in payload) payload.editors = [];
    if ('gallery' in payload) payload.gallery = [];
    if (payload.reminderSchedule && typeof payload.reminderSchedule === 'object') {
      const schedule = payload.reminderSchedule as { intervalDays?: unknown; enabled?: unknown };
      const firstDay = Array.isArray(schedule.intervalDays) && typeof schedule.intervalDays[0] === 'number'
        ? schedule.intervalDays[0]
        : 1;
      payload.reminderSchedule = {
        enabled: schedule.enabled !== false,
        intervalDays: [firstDay],
        customDates: [],
      };
    }
  }

  await db.runTransaction(async (tx) => {
    const [existing, usageSnap] = await Promise.all([tx.get(resourceRef), tx.get(usageRef)]);
    if (existing.exists) throw new ApiError(409, 'ALREADY_EXISTS', 'Content already exists');

    const usage = usageSnap.data() ?? {};
    let current = Number(usage[resource]);
    if (!Number.isFinite(current)) {
      const existingItems = await tx.get(db.collection(resource).where('ownerId', '==', uid));
      current = existingItems.size;
    }
    const limit = FREE_LIMITS[resource];
    if (!entitlement.active && current >= limit) {
      throw new ApiError(402, 'LIMIT_REACHED', 'Free plan limit reached', {
        resource,
        current,
        limit,
      });
    }

    tx.set(resourceRef, {
      ...payload,
      ownerId: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(
      usageRef,
      { [resource]: current + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  });
}

async function deleteOwnedContent(uid: string, resource: LimitedResource, id: string): Promise<void> {
  const db = admin.firestore();
  const resourceRef = db.collection(resource).doc(id);
  const usageRef = db.collection('subscriptionUsage').doc(uid);

  if (resource === 'projects') {
    const existing = await resourceRef.get();
    if (existing.exists && existing.data()?.ownerId !== uid) {
      throw new ApiError(403, 'PERMISSION_DENIED', 'Permission denied');
    }
    if (existing.exists) {
      await db.recursiveDelete(resourceRef);
      await db.runTransaction(async (tx) => {
        const usageSnap = await tx.get(usageRef);
        const rawCurrent = usageSnap.data()?.[resource];
        const current = Number.isFinite(Number(rawCurrent))
          ? Math.max(0, Number(rawCurrent) - 1)
          : (await tx.get(db.collection(resource).where('ownerId', '==', uid))).size;
        tx.set(
          usageRef,
          { [resource]: Math.max(0, current), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true }
        );
      });
    }
    return;
  }

  await db.runTransaction(async (tx) => {
    const [existing, usageSnap] = await Promise.all([tx.get(resourceRef), tx.get(usageRef)]);
    if (existing.exists && existing.data()?.ownerId !== uid) {
      throw new ApiError(403, 'PERMISSION_DENIED', 'Permission denied');
    }
    if (existing.exists) tx.delete(resourceRef);
    const rawCurrent = usageSnap.data()?.[resource];
    const current = Number.isFinite(Number(rawCurrent))
      ? Number(rawCurrent)
      : (await tx.get(db.collection(resource).where('ownerId', '==', uid))).size;
    tx.set(
      usageRef,
      { [resource]: Math.max(0, current - (existing.exists ? 1 : 0)), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  });
}

async function projectForEditor(uid: string, projectId: string) {
  const ref = admin.firestore().collection('projects').doc(projectId);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError(404, 'NOT_FOUND', 'Project not found');
  const data = snap.data() ?? {};
  const editors = Array.isArray(data.editors) ? data.editors : [];
  if (data.ownerId !== uid && !editors.includes(uid)) {
    throw new ApiError(403, 'PERMISSION_DENIED', 'Permission denied');
  }
  return { ref, data };
}

async function createProjectTask(
  uid: string,
  projectId: string,
  id: string,
  input: Record<string, unknown>
): Promise<void> {
  const { ref, data } = await projectForEditor(uid, projectId);
  const ownerEntitlement = await getAuthoritativeEntitlement(String(data.ownerId));
  if (!ownerEntitlement.active) {
    throw new ApiError(402, 'PREMIUM_REQUIRED', 'Premium required to create project tasks');
  }
  await ref.collection('tasks').doc(id).create({
    title: requiredString(input, 'title'),
    status: input.status === 'in-progress' || input.status === 'done' ? input.status : 'todo',
    dueDate: input.dueDate ? normalizeValue('dueDate', input.dueDate) : null,
    notes: typeof input.notes === 'string' ? input.notes : null,
    category: typeof input.category === 'string' ? input.category : 'general',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function deleteProjectTask(uid: string, projectId: string, id: string): Promise<void> {
  const { ref } = await projectForEditor(uid, projectId);
  await ref.collection('tasks').doc(id).delete();
}

export const mutateContent = onRequest(
  { region: REGION, secrets: [revenueCatApiKey], cors: true, timeoutSeconds: 30 },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ code: 'METHOD_NOT_ALLOWED', error: 'Method not allowed' });
      return;
    }
    try {
      const uid = await requireAuth(req);
      const body = bodyRecord(req.body);
      const action = requiredString(body, 'action') as MutationAction;
      const id = requiredString(body, 'id');
      const input = body.data && typeof body.data === 'object'
        ? (body.data as Record<string, unknown>)
        : {};

      if (action === 'create' || action === 'delete') {
        const resource = resourceFromBody(body);
        if (action === 'create') await createOwnedContent(uid, resource, id, input);
        else await deleteOwnedContent(uid, resource, id);
      } else if (action === 'createProjectTask' || action === 'deleteProjectTask') {
        const projectId = requiredString(body, 'projectId');
        if (action === 'createProjectTask') await createProjectTask(uid, projectId, id, input);
        else await deleteProjectTask(uid, projectId, id);
      } else {
        throw new ApiError(400, 'INVALID_ARGUMENT', 'Invalid action');
      }
      res.status(200).json({ ok: true, id });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.status).json({ code: error.code, error: error.message, ...error.details });
        return;
      }
      console.error('mutateContent failed', error);
      res.status(503).json({ code: 'ENTITLEMENT_UNAVAILABLE', error: 'Request could not be verified' });
    }
  }
);

async function deleteQuery(query: admin.firestore.Query): Promise<void> {
  const db = admin.firestore();
  while (true) {
    const snapshot = await query.limit(200).get();
    if (snapshot.empty) return;
    const writer = db.bulkWriter();
    for (const item of snapshot.docs) writer.delete(item.ref);
    await writer.close();
  }
}

async function removeUserFromSharedAccess(uid: string): Promise<void> {
  const db = admin.firestore();
  for (const collectionName of ['notes', 'bookmarks', 'projects', 'bookmarkLists']) {
    const [shared, editors] = await Promise.all([
      db.collection(collectionName).where('sharedWith', 'array-contains', uid).get(),
      db.collection(collectionName).where('editors', 'array-contains', uid).get(),
    ]);
    const refs = new Map<string, admin.firestore.DocumentReference>();
    for (const item of [...shared.docs, ...editors.docs]) refs.set(item.ref.path, item.ref);
    const writer = db.bulkWriter();
    for (const ref of refs.values()) {
      writer.update(ref, {
        sharedWith: admin.firestore.FieldValue.arrayRemove(uid),
        editors: admin.firestore.FieldValue.arrayRemove(uid),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await writer.close();
  }
}

export const deleteAccount = onRequest(
  { region: REGION, cors: true, timeoutSeconds: 120 },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ code: 'METHOD_NOT_ALLOWED', error: 'Method not allowed' });
      return;
    }
    try {
      const uid = await requireAuth(req);
      const db = admin.firestore();
      for (const collectionName of Object.keys(FREE_LIMITS)) {
        const owned = await db.collection(collectionName).where('ownerId', '==', uid).get();
        for (const item of owned.docs) await db.recursiveDelete(item.ref);
      }
      await removeUserFromSharedAccess(uid);
      await Promise.all([
        deleteQuery(db.collection('shares').where('toUserId', '==', uid)),
        deleteQuery(db.collection('shares').where('createdBy', '==', uid)),
        deleteQuery(db.collection('invites').where('createdBy', '==', uid)),
        deleteQuery(db.collection('projectMembers').where('userId', '==', uid)),
        deleteQuery(db.collection('listFollowers').where('userId', '==', uid)),
      ]);
      await Promise.all([
        db.collection('subscriptionEntitlements').doc(uid).delete(),
        db.collection('subscriptionUsage').doc(uid).delete(),
        db.collection('users').doc(uid).delete(),
      ]);
      await admin.auth().deleteUser(uid);
      res.status(200).json({ ok: true });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.status).json({ code: error.code, error: error.message });
        return;
      }
      console.error('deleteAccount failed', error);
      res.status(500).json({ code: 'ACCOUNT_DELETE_FAILED', error: 'Account could not be deleted' });
    }
  }
);
