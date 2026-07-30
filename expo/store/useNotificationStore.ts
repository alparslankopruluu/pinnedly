import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/store/useAuthStore';
import { getFirebaseWebApp } from '@/lib/firebaseApp';

export interface NotificationItem {
  id: string;
  userId: string;
  actorId: string;
  actorDisplayName?: string;
  type: 'project_member' | 'entity_share' | 'general';
  title: string;
  body: string;
  entityType?: 'project' | 'note' | 'bookmark' | 'list';
  entityId?: string;
  read: boolean;
  createdAt?: number | null;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (Platform.OS === 'web') {
      let unsubscribe: (() => void) | undefined;
      void (async () => {
        const { getFirestore, collection, query, where, orderBy, onSnapshot } = await import('firebase/firestore');
        const db = getFirestore(getFirebaseWebApp() as never);
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', user.id),
          orderBy('createdAt', 'desc')
        );
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const list: NotificationItem[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              const rawCreatedAt = data.createdAt;
              const createdAt =
                typeof rawCreatedAt?.toMillis === 'function'
                  ? rawCreatedAt.toMillis()
                  : typeof rawCreatedAt === 'number'
                    ? rawCreatedAt
                    : Date.now();
              return {
                id: docSnap.id,
                userId: data.userId,
                actorId: data.actorId,
                actorDisplayName: data.actorDisplayName,
                type: data.type || 'general',
                title: data.title || '',
                body: data.body || '',
                entityType: data.entityType,
                entityId: data.entityId,
                read: Boolean(data.read),
                createdAt,
              };
            });
            setNotifications(list);
            setIsLoading(false);
          },
          (error) => {
            console.error('Web notifications snapshot error:', error);
            setIsLoading(false);
          }
        );
      })();
      return () => unsubscribe?.();
    }

    let unsubscribeNative: (() => void) | undefined;
    void (async () => {
      const firestore = (await import('@react-native-firebase/firestore')).default;
      unsubscribeNative = firestore()
        .collection('notifications')
        .where('userId', '==', user.id)
        .orderBy('createdAt', 'desc')
        .onSnapshot(
          (snapshot) => {
            if (!snapshot) {
              setIsLoading(false);
              return;
            }
            const list: NotificationItem[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              const rawCreatedAt = data.createdAt;
              const createdAt =
                rawCreatedAt && typeof rawCreatedAt.toMillis === 'function'
                  ? rawCreatedAt.toMillis()
                  : Date.now();
              return {
                id: docSnap.id,
                userId: data.userId,
                actorId: data.actorId,
                actorDisplayName: data.actorDisplayName,
                type: data.type || 'general',
                title: data.title || '',
                body: data.body || '',
                entityType: data.entityType,
                entityId: data.entityId,
                read: Boolean(data.read),
                createdAt,
              };
            });
            setNotifications(list);
            setIsLoading(false);
          },
          (error) => {
            console.error('Native notifications snapshot error:', error);
            setIsLoading(false);
          }
        );
    })();

    return () => unsubscribeNative?.();
  }, [user?.id]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!user?.id || !notificationId) return;
      try {
        if (Platform.OS === 'web') {
          const { getFirestore, doc, updateDoc } = await import('firebase/firestore');
          const db = getFirestore(getFirebaseWebApp() as never);
          await updateDoc(doc(db, 'notifications', notificationId), {
            read: true,
            updatedAt: Date.now(),
          });
        } else {
          const firestore = (await import('@react-native-firebase/firestore')).default;
          await firestore()
            .collection('notifications')
            .doc(notificationId)
            .update({
              read: true,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });
        }
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    },
    [user?.id]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markAsRead(n.id)));
  }, [markAsRead, notifications, user?.id]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  };
}
