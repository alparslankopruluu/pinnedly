import { BookmarkList, ID, Visibility } from '@/types';
import {
  COLLECTIONS,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  type DocumentData,
  doc,
  getDb,
  getDoc,
  getDocs,
  increment,
  limit as limitQuery,
  query,
  requireUserId,
  serverTimestamp,
  timestampToMillis,
  updateDoc,
  where,
} from '@/lib/firestore';
import { contentAccessApi } from '@/services/contentAccessApi';

class BookmarkListRepository {
  async createList(
    name: string,
    description?: string,
    visibility: 'private' | 'shared' | 'public' = 'private'
  ): Promise<BookmarkList> {
    requireUserId();
    const isPublic = visibility === 'public';
    const ref = doc(collection(getDb(), COLLECTIONS.bookmarkLists)) as { id: string };
    await contentAccessApi.create('bookmarkLists', ref.id, {
      name: name.trim(),
      description: description?.trim() ?? null,
      isPublic,
      visibility,
      sharedWith: [],
      editors: [],
      followerCount: 0,
      bookmarkIds: [],
    });
    const created = await getDoc(ref);
    return this.mapList(created.id, created.data()!);
  }

  async getMyLists(): Promise<BookmarkList[]> {
    const uid = requireUserId();
    const snapshot = await getDocs(
      query(collection(getDb(), COLLECTIONS.bookmarkLists), where('ownerId', '==', uid))
    );
    return snapshot.docs.map((snapshotDoc) => this.mapList(snapshotDoc.id, snapshotDoc.data()));
  }

  async getSharedLists(): Promise<BookmarkList[]> {
    const uid = requireUserId();
    const snapshot = await getDocs(
      query(
        collection(getDb(), COLLECTIONS.bookmarkLists),
        where('sharedWith', 'array-contains', uid)
      )
    );
    return snapshot.docs.map((snapshotDoc) => this.mapList(snapshotDoc.id, snapshotDoc.data()));
  }

  async getPublicLists(limit: number = 20): Promise<BookmarkList[]> {
    const snapshot = await getDocs(
      query(
        collection(getDb(), COLLECTIONS.bookmarkLists),
        where('isPublic', '==', true),
        limitQuery(limit)
      )
    );
    return snapshot.docs
      .map((snapshotDoc) => this.mapList(snapshotDoc.id, snapshotDoc.data()))
      .sort((a, b) => b.followerCount - a.followerCount);
  }

  async getListById(id: ID): Promise<BookmarkList | null> {
    const listDoc = await getDoc(doc(getDb(), COLLECTIONS.bookmarkLists, id));
    if (!listDoc.exists()) return null;
    return this.mapList(listDoc.id, listDoc.data());
  }

  async getBookmarksByListId(listId: ID): Promise<string[]> {
    const listDoc = await getDoc(doc(getDb(), COLLECTIONS.bookmarkLists, listId));
    if (!listDoc.exists()) return [];
    return (listDoc.data()?.bookmarkIds as string[]) || [];
  }

  async addBookmarkToList(listId: ID, bookmarkId: ID): Promise<void> {
    requireUserId();
    await updateDoc(doc(getDb(), COLLECTIONS.bookmarkLists, listId), {
      bookmarkIds: arrayUnion(bookmarkId),
      updatedAt: serverTimestamp(),
    });
  }

  async removeBookmarkFromList(listId: ID, bookmarkId: ID): Promise<void> {
    requireUserId();
    await updateDoc(doc(getDb(), COLLECTIONS.bookmarkLists, listId), {
      bookmarkIds: arrayRemove(bookmarkId),
      updatedAt: serverTimestamp(),
    });
  }

  async updateList(
    id: ID,
    updates: Partial<Pick<BookmarkList, 'name' | 'description' | 'isPublic' | 'visibility'>>
  ): Promise<BookmarkList> {
    requireUserId();
    const ref = doc(getDb(), COLLECTIONS.bookmarkLists, id);
    const visibility = updates.visibility;
    const isPublic =
      updates.isPublic !== undefined
        ? updates.isPublic
        : visibility === 'public'
          ? true
          : visibility !== undefined
            ? false
            : undefined;

    await updateDoc(ref, {
      ...(updates.name !== undefined && { name: updates.name.trim() }),
      ...(updates.description !== undefined && { description: updates.description?.trim() }),
      ...(isPublic !== undefined && { isPublic }),
      ...(visibility !== undefined && { visibility }),
      updatedAt: serverTimestamp(),
    });
    const updated = await getDoc(ref);
    return this.mapList(updated.id, updated.data()!);
  }

  async deleteList(id: ID): Promise<void> {
    requireUserId();
    await contentAccessApi.delete('bookmarkLists', id);
  }

  async followList(listId: ID): Promise<void> {
    const uid = requireUserId();
    await addDoc(collection(getDb(), COLLECTIONS.listFollowers), {
      listId,
      userId: uid,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(getDb(), COLLECTIONS.bookmarkLists, listId), {
      followerCount: increment(1),
    });
  }

  async unfollowList(listId: ID): Promise<void> {
    const uid = requireUserId();
    const snapshot = await getDocs(
      query(
        collection(getDb(), COLLECTIONS.listFollowers),
        where('listId', '==', listId),
        where('userId', '==', uid)
      )
    );
    await Promise.all(snapshot.docs.map((snapshotDoc) => deleteDoc(snapshotDoc.ref)));
    await updateDoc(doc(getDb(), COLLECTIONS.bookmarkLists, listId), {
      followerCount: increment(-1),
    });
  }

  async isFollowingList(listId: ID): Promise<boolean> {
    const uid = requireUserId();
    const snapshot = await getDocs(
      query(
        collection(getDb(), COLLECTIONS.listFollowers),
        where('listId', '==', listId),
        where('userId', '==', uid),
        limitQuery(1)
      )
    );
    return !snapshot.empty;
  }

  async getFollowedLists(): Promise<BookmarkList[]> {
    const uid = requireUserId();
    const followers = await getDocs(
      query(collection(getDb(), COLLECTIONS.listFollowers), where('userId', '==', uid))
    );

    const lists: BookmarkList[] = [];
    for (const follower of followers.docs) {
      const listId = follower.data().listId as string;
      const list = await this.getListById(listId);
      if (list) lists.push(list);
    }
    return lists;
  }

  async searchPublicLists(query: string): Promise<BookmarkList[]> {
    if (!query.trim()) return [];
    const lists = await this.getPublicLists(50);
    const q = query.toLowerCase();
    return lists.filter(
      (list) =>
        list.name.toLowerCase().includes(q) ||
        (list.description?.toLowerCase().includes(q) ?? false)
    );
  }

  private mapList(id: string, data: DocumentData): BookmarkList {
    const visibility = (data.visibility as BookmarkList['visibility']) ||
      (data.isPublic ? 'public' : 'private');
    return {
      id,
      name: data.name,
      description: data.description,
      isPublic: data.isPublic ?? visibility === 'public',
      visibility,
      sharedWith: (data.sharedWith as string[]) || [],
      ownerId: data.ownerId,
      followerCount: data.followerCount ?? 0,
      bookmarkIds: (data.bookmarkIds as string[]) || [],
      bookmarks: [],
      createdAt: timestampToMillis(data.createdAt),
      updatedAt: timestampToMillis(data.updatedAt),
    };
  }
}

export const bookmarkListRepository = new BookmarkListRepository();
