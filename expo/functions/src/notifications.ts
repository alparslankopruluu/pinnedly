import * as admin from 'firebase-admin';

export interface CreateNotificationInput {
  targetUserId: string;
  actorId: string;
  entityType: 'project' | 'note' | 'bookmark' | 'list';
  entityId: string;
  permission?: 'view' | 'edit';
}

const ENTITY_COLLECTIONS: Record<string, string> = {
  project: 'projects',
  note: 'notes',
  bookmark: 'bookmarks',
  list: 'bookmarkLists',
};

async function getActorDisplayName(actorId: string): Promise<string> {
  try {
    const snap = await admin.firestore().collection('users').doc(actorId).get();
    if (snap.exists) {
      const data = snap.data();
      return data?.displayName || data?.handle || 'Bir kullanıcı';
    }
  } catch (error) {
    console.error('Failed to get actor display name:', error);
  }
  return 'Bir kullanıcı';
}

async function getEntityTitle(entityType: string, entityId: string): Promise<string> {
  const collection = ENTITY_COLLECTIONS[entityType];
  if (!collection) return '';
  try {
    const snap = await admin.firestore().collection(collection).doc(entityId).get();
    if (snap.exists) {
      const data = snap.data();
      return data?.title || data?.name || data?.label || '';
    }
  } catch (error) {
    console.error('Failed to get entity title:', error);
  }
  return '';
}

export async function createUserNotificationAndPush(input: CreateNotificationInput): Promise<string | null> {
  const { targetUserId, actorId, entityType, entityId } = input;
  if (!targetUserId || targetUserId === actorId) return null;

  const db = admin.firestore();

  // 1. Fetch actor name and entity title concurrently
  const [actorName, entityTitle] = await Promise.all([
    getActorDisplayName(actorId),
    getEntityTitle(entityType, entityId),
  ]);

  // 2. Build title and body
  const isProject = entityType === 'project';
  const notificationType = isProject ? 'project_member' : 'entity_share';

  const title = isProject ? 'Projeye eklendiniz' : 'İçerik paylaşıldı';
  const displayTitle = entityTitle ? `"${entityTitle}"` : (isProject ? 'bir projeye' : 'bir içeriğe');
  const body = isProject
    ? `${actorName} sizi ${displayTitle} ekledi.`
    : `${actorName} sizinle ${displayTitle} paylaştı.`;

  // 3. Create notification doc in Firestore
  const notificationRef = db.collection('notifications').doc();
  const notificationData = {
    userId: targetUserId,
    actorId,
    actorDisplayName: actorName,
    type: notificationType,
    title,
    body,
    entityType,
    entityId,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await notificationRef.set(notificationData);

  // 4. Load recipient user's tokens and trigger push
  try {
    const userSnap = await db.collection('users').doc(targetUserId).get();
    if (userSnap.exists) {
      const userData = userSnap.data() || {};
      const expoPushTokens: string[] = Array.isArray(userData.expoPushTokens)
        ? userData.expoPushTokens
        : userData.expoPushToken
          ? [userData.expoPushToken]
          : [];
      const fcmTokens: string[] = Array.isArray(userData.fcmTokens)
        ? userData.fcmTokens
        : userData.fcmToken
          ? [userData.fcmToken]
          : [];

      // Send via Expo Push API
      if (expoPushTokens.length > 0) {
        const expoMessages = expoPushTokens.map((token) => ({
          to: token,
          sound: 'default',
          title,
          body,
          data: {
            notificationId: notificationRef.id,
            type: notificationType,
            entityType,
            entityId,
          },
        }));

        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(expoMessages),
        }).catch((err: unknown) => console.error('Expo push send error:', err));
      }

      // Send via FCM if FCM tokens exist
      if (fcmTokens.length > 0) {
        await admin
          .messaging()
          .sendEachForMulticast({
            tokens: fcmTokens,
            notification: { title, body },
            data: {
              notificationId: notificationRef.id,
              type: notificationType,
              entityType,
              entityId,
            },
          })
          .catch((err: unknown) => console.error('FCM send error:', err));
      }
    }
  } catch (pushErr) {
    console.error('Failed to send push notification:', pushErr);
  }

  return notificationRef.id;
}
