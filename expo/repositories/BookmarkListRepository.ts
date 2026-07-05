import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { BookmarkList, ID } from '@/types';
import { COLLECTIONS, requireUserId, serverTimestamp, timestampToMillis } from '@/lib/firestore';

class BookmarkListRepository {
  async createList(name: string, description?: string, isPublic: boolean = false): Promise<BookmarkList> {
    const uid = requireUserId();
    const ref = firestore().collection(COLLECTIONS.bookmarkLists).doc();
    await ref.set({
      ownerId: uid,
      name: name.trim(),
      description: description?.trim() ?? null,
      isPublic,
      followerCount: 0,
      bookmarkIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const created = await ref.get();
    return this.mapList(created.id, created.data()!);
  }

  async getMyLists(): Promise<BookmarkList[]> {
    const uid = requireUserId();
    const snapshot = await firestore()
      .collection(COLLECTIONS.bookmarkLists)
      .where('ownerId', '==', uid)
      .get();
    return snapshot.docs.map((doc) => this.mapList(doc.id, doc.data()));
  }

  async getPublicLists(limit: number = 20): Promise<BookmarkList[]> {
    const snapshot = await firestore()
      .collection(COLLECTIONS.bookmarkLists)
      .where('isPublic', '==', true)
      .limit(limit)
      .get();
    return snapshot.docs
      .map((doc) => this.mapList(doc.id, doc.data()))
      .sort((a, b) => b.followerCount - a.followerCount);
  }

  async getListById(id: ID): Promise<BookmarkList | null> {
    const doc = await firestore().collection(COLLECTIONS.bookmarkLists).doc(id).get();
    if (!doc.exists()) return null;
    return this.mapList(doc.id, doc.data()!);
  }

  async getBookmarksByListId(listId: ID): Promise<string[]> {
    const doc = await firestore().collection(COLLECTIONS.bookmarkLists).doc(listId).get();
    if (!doc.exists()) return [];
    return (doc.data()?.bookmarkIds as string[]) || [];
  }

  async addBookmarkToList(listId: ID, bookmarkId: ID): Promise<void> {
    requireUserId();
    await firestore()
      .collection(COLLECTIONS.bookmarkLists)
      .doc(listId)
      .update({
        bookmarkIds: firestore.FieldValue.arrayUnion(bookmarkId),
        updatedAt: serverTimestamp(),
      });
  }

  async removeBookmarkFromList(listId: ID, bookmarkId: ID): Promise<void> {
    requireUserId();
    await firestore()
      .collection(COLLECTIONS.bookmarkLists)
      .doc(listId)
      .update({
        bookmarkIds: firestore.FieldValue.arrayRemove(bookmarkId),
        updatedAt: serverTimestamp(),
      });
  }

  async updateList(
    id: ID,
    updates: Partial<Pick<BookmarkList, 'name' | 'description' | 'isPublic'>>
  ): Promise<BookmarkList> {
    requireUserId();
    const ref = firestore().collection(COLLECTIONS.bookmarkLists).doc(id);
    await ref.update({
      ...(updates.name !== undefined && { name: updates.name.trim() }),
      ...(updates.description !== undefined && { description: updates.description?.trim() }),
      ...(updates.isPublic !== undefined && { isPublic: updates.isPublic }),
      updatedAt: serverTimestamp(),
    });
    const updated = await ref.get();
    return this.mapList(updated.id, updated.data()!);
  }

  async deleteList(id: ID): Promise<void> {
    requireUserId();
    await firestore().collection(COLLECTIONS.bookmarkLists).doc(id).delete();
  }

  async followList(listId: ID): Promise<void> {
    const uid = requireUserId();
    await firestore().collection(COLLECTIONS.listFollowers).add({
      listId,
      userId: uid,
      createdAt: serverTimestamp(),
    });
    await firestore()
      .collection(COLLECTIONS.bookmarkLists)
      .doc(listId)
      .update({ followerCount: firestore.FieldValue.increment(1) });
  }

  async unfollowList(listId: ID): Promise<void> {
    const uid = requireUserId();
    const snapshot = await firestore()
      .collection(COLLECTIONS.listFollowers)
      .where('listId', '==', listId)
      .where('userId', '==', uid)
      .get();
    await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
    await firestore()
      .collection(COLLECTIONS.bookmarkLists)
      .doc(listId)
      .update({ followerCount: firestore.FieldValue.increment(-1) });
  }

  async isFollowingList(listId: ID): Promise<boolean> {
    const uid = requireUserId();
    const snapshot = await firestore()
      .collection(COLLECTIONS.listFollowers)
      .where('listId', '==', listId)
      .where('userId', '==', uid)
      .limit(1)
      .get();
    return !snapshot.empty;
  }

  async getFollowedLists(): Promise<BookmarkList[]> {
    const uid = requireUserId();
    const followers = await firestore()
      .collection(COLLECTIONS.listFollowers)
      .where('userId', '==', uid)
      .get();

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

  private mapList(id: string, data: FirebaseFirestoreTypes.DocumentData): BookmarkList {
    return {
      id,
      name: data.name,
      description: data.description,
      isPublic: data.isPublic ?? false,
      ownerId: data.ownerId,
      followerCount: data.followerCount ?? 0,
      bookmarks: [],
      createdAt: timestampToMillis(data.createdAt),
      updatedAt: timestampToMillis(data.updatedAt),
    };
  }
}

export const bookmarkListRepository = new BookmarkListRepository();