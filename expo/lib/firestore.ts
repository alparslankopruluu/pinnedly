import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export const COLLECTIONS = {
  users: 'users',
  notes: 'notes',
  bookmarks: 'bookmarks',
  projects: 'projects',
  todos: 'todos',
  bookmarkLists: 'bookmarkLists',
  listFollowers: 'listFollowers',
  shares: 'shares',
  projectMembers: 'projectMembers',
} as const;

let persistenceInitialized = false;

export async function initializeFirestore(): Promise<void> {
  if (persistenceInitialized) return;
  try {
    await firestore().settings({ persistence: true });
    persistenceInitialized = true;
    console.log('Firestore offline persistence enabled');
  } catch (error) {
    console.warn('Firestore persistence setup:', error);
  }
}

export function getDb() {
  return firestore();
}

export function getCurrentUserId(): string | null {
  return auth().currentUser?.uid ?? null;
}

export function requireUserId(): string {
  const uid = getCurrentUserId();
  if (!uid) throw new Error('User not authenticated');
  return uid;
}

export function serverTimestamp(): FirebaseFirestoreTypes.FieldValue {
  return firestore.FieldValue.serverTimestamp();
}

export function timestampToMillis(
  value: FirebaseFirestoreTypes.Timestamp | number | undefined | null
): number {
  if (!value) return Date.now();
  if (typeof value === 'number') return value;
  return value.toMillis();
}

export function subscribeToOwnerCollection<T>(
  collectionName: string,
  ownerId: string | null,
  onData: (items: T[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!ownerId) {
    onData([]);
    return () => undefined;
  }

  const unsubscribe = firestore()
    .collection(collectionName)
    .where('ownerId', '==', ownerId)
    .onSnapshot(
      (snapshot) => {
        const items = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((a, b) => {
            const aTime = (a as { updatedAt?: { toMillis?: () => number } }).updatedAt?.toMillis?.() ?? 0;
            const bTime = (b as { updatedAt?: { toMillis?: () => number } }).updatedAt?.toMillis?.() ?? 0;
            return bTime - aTime;
          }) as T[];
        onData(items);
      },
      (error) => {
        console.error(`Firestore listener error (${collectionName}):`, error);
        onError?.(error);
      }
    );

  return unsubscribe;
}