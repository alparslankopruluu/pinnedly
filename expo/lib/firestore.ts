import { Platform } from 'react-native';
import { getCurrentUserId as getAuthUserId } from '@/lib/auth';
import { getFirebaseWebApp } from '@/lib/firebaseApp';

declare const require: <T = unknown>(moduleName: string) => T;

export type DocumentData = Record<string, any>;

export type DocumentSnapshotLike<T extends DocumentData = DocumentData> = {
  id: string;
  ref: unknown;
  data: () => T;
  exists: () => boolean;
};

export type QuerySnapshotLike<T extends DocumentData = DocumentData> = {
  docs: DocumentSnapshotLike<T>[];
  empty: boolean;
};

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
  invites: 'invites',
} as const;

let persistenceInitialized = false;

function nativeApp() {
  return require<typeof import('@react-native-firebase/app')>('@react-native-firebase/app');
}

function nativeFirestore() {
  return require<typeof import('@react-native-firebase/firestore')>(
    '@react-native-firebase/firestore'
  );
}

function webFirestore() {
  return require<typeof import('firebase/firestore')>('firebase/firestore');
}

function firestoreModule(): any {
  return Platform.OS === 'web' ? webFirestore() : nativeFirestore();
}

export async function initializeFirestore(): Promise<void> {
  if (persistenceInitialized) return;

  try {
    if (Platform.OS === 'web') {
      const firestore = webFirestore();
      const db = getDb();
      try {
        await firestore.enableIndexedDbPersistence(db as never);
        console.log('Firestore web offline persistence enabled');
      } catch (error) {
        if (__DEV__) console.debug('Firestore web persistence skipped:', error);
      }
      persistenceInitialized = true;
      return;
    }

    await nativeFirestore().initializeFirestore(nativeApp().getApp(), { persistence: true });
    persistenceInitialized = true;
    console.log('Firestore offline persistence enabled');
  } catch (error) {
    console.warn('Firestore persistence setup:', error);
  }
}

export function getDb(): unknown {
  if (Platform.OS === 'web') {
    return webFirestore().getFirestore(getFirebaseWebApp() as never);
  }
  return nativeFirestore().getFirestore();
}

export function getCurrentUserId(): string | null {
  return getAuthUserId();
}

export function requireUserId(): string {
  const uid = getCurrentUserId();
  if (!uid) throw new Error('User not authenticated');
  return uid;
}

export function serverTimestamp(): unknown {
  return firestoreModule().serverTimestamp();
}

export function arrayRemove(...elements: unknown[]): unknown {
  return firestoreModule().arrayRemove(...elements);
}

export function arrayUnion(...elements: unknown[]): unknown {
  return firestoreModule().arrayUnion(...elements);
}

export function increment(value: number): unknown {
  return firestoreModule().increment(value);
}

export function collection(parent: unknown, path: string, ...pathSegments: string[]): unknown {
  return firestoreModule().collection(parent as never, path, ...pathSegments);
}

export function doc(parent: unknown, path?: string, ...pathSegments: string[]): unknown {
  if (path === undefined) {
    return firestoreModule().doc(parent as never);
  }
  return firestoreModule().doc(parent as never, path, ...pathSegments);
}

export function query(source: unknown, ...queryConstraints: unknown[]): unknown {
  return firestoreModule().query(source as never, ...(queryConstraints as never[]));
}

export function where(fieldPath: string, opStr: string, value: unknown): unknown {
  return firestoreModule().where(fieldPath, opStr as never, value);
}

export function limit(limitValue: number): unknown {
  return firestoreModule().limit(limitValue);
}

export async function addDoc<T extends DocumentData = DocumentData>(
  reference: unknown,
  data: T
): Promise<unknown> {
  return firestoreModule().addDoc(reference as never, data as never);
}

export async function setDoc<T extends DocumentData = DocumentData>(
  reference: unknown,
  data: T
): Promise<void> {
  await firestoreModule().setDoc(reference as never, data as never);
}

export async function updateDoc<T extends DocumentData = DocumentData>(
  reference: unknown,
  data: Partial<T>
): Promise<void> {
  await firestoreModule().updateDoc(reference as never, data as never);
}

export async function deleteDoc(reference: unknown): Promise<void> {
  await firestoreModule().deleteDoc(reference as never);
}

export async function getDoc<T extends DocumentData = DocumentData>(
  reference: unknown
): Promise<DocumentSnapshotLike<T>> {
  return firestoreModule().getDoc(reference as never) as Promise<DocumentSnapshotLike<T>>;
}

export async function getDocs<T extends DocumentData = DocumentData>(
  source: unknown
): Promise<QuerySnapshotLike<T>> {
  return firestoreModule().getDocs(source as never) as Promise<QuerySnapshotLike<T>>;
}

export function writeBatch(db: unknown): {
  delete: (reference: unknown) => void;
  commit: () => Promise<void>;
} {
  return firestoreModule().writeBatch(db as never) as {
    delete: (reference: unknown) => void;
    commit: () => Promise<void>;
  };
}

export function onQuerySnapshot<T extends DocumentData = DocumentData>(
  queryRef: unknown,
  onNext: (snapshot: QuerySnapshotLike<T>) => void,
  onError?: (error: Error) => void
): () => void {
  const module = firestoreModule() as {
    onSnapshot?: (
      source: unknown,
      onNext: (snapshot: QuerySnapshotLike<T>) => void,
      onError?: (error: Error) => void
    ) => () => void;
  };

  if (module.onSnapshot) {
    return module.onSnapshot(queryRef, onNext, onError);
  }

  return (queryRef as {
    onSnapshot: (
      onNext: (snapshot: QuerySnapshotLike<T>) => void,
      onError?: (error: Error) => void
    ) => () => void;
  }).onSnapshot(onNext, onError);
}

export function timestampToMillis(value: unknown): number {
  if (!value) return Date.now();
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  if (
    typeof value === 'object' &&
    'seconds' in value &&
    typeof value.seconds === 'number'
  ) {
    const nanoseconds =
      'nanoseconds' in value && typeof value.nanoseconds === 'number' ? value.nanoseconds : 0;
    return value.seconds * 1000 + Math.floor(nanoseconds / 1_000_000);
  }
  return Date.now();
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

  const ownerQuery = query(
    collection(getDb(), collectionName),
    where('ownerId', '==', ownerId)
  );

  return onQuerySnapshot(
    ownerQuery,
    (snapshot) => {
      const items = snapshot.docs
        .map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...snapshotDoc.data(),
        }))
        .sort((a, b) => {
          const aTime = timestampToMillis((a as { updatedAt?: unknown }).updatedAt);
          const bTime = timestampToMillis((b as { updatedAt?: unknown }).updatedAt);
          return bTime - aTime;
        }) as T[];
      onData(items);
    },
    (error) => {
      console.error(`Firestore listener error (${collectionName}):`, error);
      onError?.(error);
    }
  );
}
