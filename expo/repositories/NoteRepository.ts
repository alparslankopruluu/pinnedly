import { Note } from '@/types';
import { DEFAULT_CONTENT_CATEGORY } from '@/constants/contentCategories';
import {
  COLLECTIONS,
  collection,
  type DocumentData,
  doc,
  getDb,
  getDoc,
  getDocs,
  onQuerySnapshot,
  query,
  requireUserId,
  serverTimestamp,
  timestampToMillis,
  updateDoc,
  where,
} from '@/lib/firestore';
import { normalizeCategory } from '@/constants/contentCategories';
import { getDefaultReminderSchedule } from '@/constants/reminderDefaults';
import { mapReminderScheduleFromFirestore } from '@/services/entityReminders';
import { trackNoteEvent } from '@/lib/analytics';
import { contentAccessApi } from '@/services/contentAccessApi';

export class NoteRepository {
  private static instance: NoteRepository;

  static getInstance(): NoteRepository {
    if (!NoteRepository.instance) NoteRepository.instance = new NoteRepository();
    return NoteRepository.instance;
  }

  subscribeToNotes(ownerId: string | null, onNotes: (notes: Note[]) => void, onError?: (error: Error) => void): () => void {
    if (!ownerId) {
      onNotes([]);
      return () => undefined;
    }

    const ownedNotesQuery = query(collection(getDb(), COLLECTIONS.notes), where('ownerId', '==', ownerId));
    const sharedNotesQuery = query(
      collection(getDb(), COLLECTIONS.notes),
      where('sharedWith', 'array-contains', ownerId)
    );
    let ownedNotes: Note[] = [];
    let sharedNotes: Note[] = [];

    const publish = () => {
      const merged = new Map<string, Note>();
      [...ownedNotes, ...sharedNotes].forEach((note) => merged.set(note.id, note));
      onNotes([...merged.values()]);
    };
    const mapSnapshot = (snapshot: { docs: Array<{ id: string; data: () => DocumentData }> }) =>
      snapshot.docs.map((snapshotDoc) => this.mapNote(snapshotDoc.id, snapshotDoc.data()));
    const handleError = (error: Error) => {
      console.error('Note subscription error:', error);
      onError?.(error);
    };

    const unsubscribeOwned = onQuerySnapshot(
      ownedNotesQuery,
      (snapshot) => {
        ownedNotes = mapSnapshot(snapshot);
        publish();
      },
      handleError
    );
    const unsubscribeShared = onQuerySnapshot(
      sharedNotesQuery,
      (snapshot) => {
        sharedNotes = mapSnapshot(snapshot);
        publish();
      },
      handleError
    );

    return () => {
      unsubscribeOwned();
      unsubscribeShared();
    };
  }

  async getNotes(): Promise<Note[]> {
    const uid = requireUserId();
    const [ownedSnapshot, sharedSnapshot] = await Promise.all([
      getDocs(query(collection(getDb(), COLLECTIONS.notes), where('ownerId', '==', uid))),
      getDocs(query(collection(getDb(), COLLECTIONS.notes), where('sharedWith', 'array-contains', uid))),
    ]);
    const notes = new Map<string, Note>();
    [...ownedSnapshot.docs, ...sharedSnapshot.docs].forEach((snapshotDoc) => {
      notes.set(snapshotDoc.id, this.mapNote(snapshotDoc.id, snapshotDoc.data()));
    });
    return [...notes.values()];
  }

  async getById(id: string): Promise<Note | null> {
    const noteDoc = await getDoc(doc(getDb(), COLLECTIONS.notes, id));
    if (!noteDoc.exists()) return null;
    return this.mapNote(noteDoc.id, noteDoc.data());
  }

  async createNote(
    note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'links'> & {
      links?: Note['links'];
    }
  ): Promise<Note> {
    requireUserId();
    const ref = doc(collection(getDb(), COLLECTIONS.notes)) as { id: string };
    const data = {
      title: note.title,
      markdown: note.markdown,
      visibility: note.visibility || 'private',
      links: note.links ?? [],
      sharedWith: [],
      editors: [],
      category: note.category ?? DEFAULT_CONTENT_CATEGORY,
      reminderSchedule: note.reminderSchedule ?? getDefaultReminderSchedule(),
    };
    await contentAccessApi.create('notes', ref.id, data);
    const created = await getDoc(ref);
    const mapped = this.mapNote(created.id, created.data()!);
    await trackNoteEvent('note_created', mapped.id);
    return mapped;
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
    requireUserId();
    const ref = doc(getDb(), COLLECTIONS.notes, id);
    await updateDoc(ref, {
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.markdown !== undefined && { markdown: updates.markdown }),
      ...(updates.visibility !== undefined && { visibility: updates.visibility }),
      ...(updates.links !== undefined && { links: updates.links }),
      ...(updates.category !== undefined && { category: updates.category }),
      ...(updates.reminderSchedule !== undefined && { reminderSchedule: updates.reminderSchedule }),
      updatedAt: serverTimestamp(),
    });
    const updated = await getDoc(ref);
    const mapped = this.mapNote(updated.id, updated.data()!);
    await trackNoteEvent('note_updated', mapped.id);
    return mapped;
  }

  async deleteNote(id: string): Promise<void> {
    requireUserId();
    await contentAccessApi.delete('notes', id);
    await trackNoteEvent('note_deleted', id);
  }

  private mapNote(id: string, data: Record<string, unknown>): Note {
    return {
      id,
      title: data.title as string,
      markdown: data.markdown as string,
      links: (data.links as Note['links']) ?? [],
      createdAt: timestampToMillis(data.createdAt as never),
      updatedAt: timestampToMillis(data.updatedAt as never),
      userId: data.ownerId as string,
      visibility: (data.visibility as Note['visibility']) || 'private',
      sharedWith: (data.sharedWith as string[]) || [],
      category: normalizeCategory(data.category as string | undefined),
      reminderSchedule: mapReminderScheduleFromFirestore(data.reminderSchedule),
    };
  }
}

export const noteRepository = NoteRepository.getInstance();
