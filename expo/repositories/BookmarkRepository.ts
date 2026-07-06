import firestore from '@react-native-firebase/firestore';
import { Bookmark } from '@/types';
import { COLLECTIONS, requireUserId, serverTimestamp, subscribeToOwnerCollection, timestampToMillis } from '@/lib/firestore';
import { trackEntityEvent } from '@/lib/analytics';
import { tagNamesToTags } from '@/utils/bookmark';
import { DEFAULT_CONTENT_CATEGORY, normalizeCategory } from '@/constants/contentCategories';
import { getDefaultReminderSchedule } from '@/constants/reminderDefaults';
import { mapReminderScheduleFromFirestore } from '@/services/entityReminders';

export type CreateBookmarkInput = Omit<
  Bookmark,
  'id' | 'createdAt' | 'openCount' | 'notes' | 'tags' | 'userId'
>;

export class BookmarkRepository {
  private static instance: BookmarkRepository;

  static getInstance(): BookmarkRepository {
    if (!BookmarkRepository.instance) BookmarkRepository.instance = new BookmarkRepository();
    return BookmarkRepository.instance;
  }

  subscribeToBookmarks(ownerId: string | null, onBookmarks: (bookmarks: Bookmark[]) => void): () => void {
    return subscribeToOwnerCollection<Record<string, unknown>>(
      COLLECTIONS.bookmarks,
      ownerId,
      (docs) => onBookmarks(docs.map((d) => this.mapBookmark(d.id as string, d))),
    );
  }

  async getBookmarks(): Promise<Bookmark[]> {
    const uid = requireUserId();
    const snapshot = await firestore().collection(COLLECTIONS.bookmarks).where('ownerId', '==', uid).get();
    return snapshot.docs.map((doc) => this.mapBookmark(doc.id, doc.data()));
  }

  async getById(id: string): Promise<Bookmark | null> {
    const doc = await firestore().collection(COLLECTIONS.bookmarks).doc(id).get();
    if (!doc.exists()) return null;
    return this.mapBookmark(doc.id, doc.data()!);
  }

  async getByIds(ids: string[]): Promise<Bookmark[]> {
    const uniqueIds = Array.from(new Set(ids));
    const results = await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          return await this.getById(id);
        } catch (error) {
          console.warn(`Failed to load bookmark ${id}:`, error);
          return null;
        }
      })
    );
    return results.filter((bookmark): bookmark is Bookmark => Boolean(bookmark));
  }

  async createBookmark(bookmark: CreateBookmarkInput): Promise<Bookmark> {
    const uid = requireUserId();
    const ref = firestore().collection(COLLECTIONS.bookmarks).doc();
    await ref.set({
      ownerId: uid,
      url: bookmark.url ?? null,
      title: bookmark.title ?? null,
      description: bookmark.description ?? null,
      imagePreview: bookmark.imagePreview ?? null,
      screenshotUri: bookmark.screenshotUri ?? null,
      source: bookmark.source ?? null,
      visibility: bookmark.visibility || 'private',
      status: bookmark.status || 'inbox',
      tagNames: bookmark.tagNames ?? [],
      personalNote: bookmark.personalNote ?? null,
      reminderAt: bookmark.reminderAt ?? null,
      readAt: bookmark.readAt ?? null,
      openCount: 0,
      lastOpenedAt: null,
      category: bookmark.category ?? DEFAULT_CONTENT_CATEGORY,
      reminderSchedule: bookmark.reminderSchedule ?? getDefaultReminderSchedule(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const created = await ref.get();
    const mapped = this.mapBookmark(created.id, created.data()!);
    await trackEntityEvent('bookmark', 'created', mapped.id);
    return mapped;
  }

  async updateBookmark(id: string, updates: Partial<Bookmark>): Promise<Bookmark> {
    requireUserId();
    const ref = firestore().collection(COLLECTIONS.bookmarks).doc(id);
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };

    if (updates.url !== undefined) payload.url = updates.url;
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.imagePreview !== undefined) payload.imagePreview = updates.imagePreview;
    if (updates.screenshotUri !== undefined) payload.screenshotUri = updates.screenshotUri;
    if (updates.source !== undefined) payload.source = updates.source;
    if (updates.visibility !== undefined) payload.visibility = updates.visibility;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.tagNames !== undefined) payload.tagNames = updates.tagNames;
    if (updates.personalNote !== undefined) payload.personalNote = updates.personalNote;
    if (updates.openCount !== undefined) payload.openCount = updates.openCount;
    if (updates.reminderAt !== undefined) payload.reminderAt = updates.reminderAt ?? null;
    if (updates.readAt !== undefined) payload.readAt = updates.readAt ?? null;
    if (updates.lastOpenedAt !== undefined) {
      payload.lastOpenedAt = updates.lastOpenedAt ? new Date(updates.lastOpenedAt) : null;
    }
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.reminderSchedule !== undefined) payload.reminderSchedule = updates.reminderSchedule;

    await ref.update(payload);
    const updated = await ref.get();
    const mapped = this.mapBookmark(updated.id, updated.data()!);
    await trackEntityEvent('bookmark', 'updated', mapped.id);
    return mapped;
  }

  async incrementOpenCount(id: string): Promise<Bookmark> {
    requireUserId();
    const ref = firestore().collection(COLLECTIONS.bookmarks).doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new Error('Bookmark not found');

    const current = (doc.data()?.openCount as number) ?? 0;
    await ref.update({
      openCount: current + 1,
      lastOpenedAt: serverTimestamp(),
      status: 'reading',
      updatedAt: serverTimestamp(),
    });

    const updated = await ref.get();
    return this.mapBookmark(updated.id, updated.data()!);
  }

  async deleteBookmark(id: string): Promise<void> {
    requireUserId();
    await firestore().collection(COLLECTIONS.bookmarks).doc(id).delete();
    await trackEntityEvent('bookmark', 'deleted', id);
  }

  private mapBookmark(id: string, data: Record<string, unknown>): Bookmark {
    const tagNames = (data.tagNames as string[]) ?? [];
    return {
      id,
      url: data.url as string | undefined,
      title: data.title as string | undefined,
      description: data.description as string | undefined,
      imagePreview: data.imagePreview as string | undefined,
      screenshotUri: data.screenshotUri as string | undefined,
      notes: [],
      tags: tagNamesToTags(tagNames),
      tagNames,
      personalNote: data.personalNote as string | undefined,
      status: (data.status as Bookmark['status']) || 'inbox',
      reminderAt: data.reminderAt as number | undefined,
      readAt: data.readAt as number | undefined,
      createdAt: timestampToMillis(data.createdAt as never),
      openCount: (data.openCount as number) ?? 0,
      lastOpenedAt: data.lastOpenedAt ? timestampToMillis(data.lastOpenedAt as never) : undefined,
      source: data.source as Bookmark['source'],
      userId: data.ownerId as string,
      visibility: (data.visibility as Bookmark['visibility']) || 'private',
      category: normalizeCategory(data.category as string | undefined),
      reminderSchedule: mapReminderScheduleFromFirestore(data.reminderSchedule),
    };
  }
}

export const bookmarkRepository = BookmarkRepository.getInstance();
