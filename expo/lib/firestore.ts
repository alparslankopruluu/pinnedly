import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import {
  arrayRemove,
  arrayUnion,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  initializeFirestore as configureFirestore,
  limit,
  query,
  serverTimestamp as firebaseServerTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type FirebaseFirestoreTypes,
  type Query,
  type QuerySnapshot,
} from '@react-native-firebase/firestore';

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

export async function initializeFirestore(): Promise<void> {
  if (persistenceInitialized) return;
  try {
    await configureFirestore(getApp(), { persistence: true });
    persistenceInitialized = true;
    console.log('Firestore offline persistence enabled');
  } catch (error) {
    console.warn('Firestore persistence setup:', error);
  }
}

export function getDb() {
  return getFirestore();
}

export function getCurrentUserId(): string | null {
  return getAuth().currentUser?.uid ?? null;
}

export function requireUserId(): string {
  const uid = getCurrentUserId();
  if (!uid) throw new Error('User not authenticated');
  return uid;
}

export function serverTimestamp() {
  return firebaseServerTimestamp();
}

export {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
};

type SnapshotQuery = Query<DocumentData, DocumentData> & {
  onSnapshot: (
    onNext: (snapshot: QuerySnapshot<DocumentData, DocumentData>) => void,
    onError?: (error: Error) => void
  ) => () => void;
};

export function onQuerySnapshot(
  queryRef: Query<DocumentData, DocumentData>,
  onNext: (snapshot: QuerySnapshot<DocumentData, DocumentData>) => void,
  onError?: (error: Error) => void
): () => void {
  return (queryRef as SnapshotQuery).onSnapshot(onNext, onError);
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

  const ownerQuery = query(
    collection(getDb(), collectionName),
    where('ownerId', '==', ownerId)
  );

  const unsubscribe = onQuerySnapshot(
    ownerQuery,
    (snapshot) => {
      const items = snapshot.docs
        .map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...snapshotDoc.data(),
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
