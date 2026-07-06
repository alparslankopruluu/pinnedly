import firestore from '@react-native-firebase/firestore';
import { Note } from '@/types';
import { DEFAULT_CONTENT_CATEGORY } from '@/constants/contentCategories';
import { COLLECTIONS, requireUserId, serverTimestamp, subscribeToOwnerCollection, timestampToMillis } from '@/lib/firestore';
import { normalizeCategory } from '@/constants/contentCategories';
import { getDefaultReminderSchedule } from '@/constants/reminderDefaults';
import { mapReminderScheduleFromFirestore } from '@/services/entityReminders';
import { trackNoteEvent } from '@/lib/analytics';

export class NoteRepository {
  private static instance: NoteRepository;

  static getInstance(): NoteRepository {
    if (!NoteRepository.instance) NoteRepository.instance = new NoteRepository();
    return NoteRepository.instance;
  }

  subscribeToNotes(ownerId: string | null, onNotes: (notes: Note[]) => void): () => void {
    return subscribeToOwnerCollection<Record<string, unknown>>(
      COLLECTIONS.notes,
      ownerId,
      (docs) => onNotes(docs.map((d) => this.mapNote(d.id as string, d))),
    );
  }

  async getNotes(): Promise<Note[]> {
    const uid = requireUserId();
    const snapshot = await firestore()
      .collection(COLLECTIONS.notes)
      .where('ownerId', '==', uid)
      .get();
    return snapshot.docs.map((doc) => this.mapNote(doc.id, doc.data()));
  }

  async createNote(
    note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'links'> & {
      links?: Note['links'];
    }
  ): Promise<Note> {
    const uid = requireUserId();
    const ref = firestore().collection(COLLECTIONS.notes).doc();
    const data = {
      ownerId: uid,
      title: note.title,
      markdown: note.markdown,
      visibility: note.visibility || 'private',
      links: note.links ?? [],
      sharedWith: [],
      editors: [],
      category: note.category ?? DEFAULT_CONTENT_CATEGORY,
      reminderSchedule: note.reminderSchedule ?? getDefaultReminderSchedule(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await ref.set(data);
    const created = await ref.get();
    const mapped = this.mapNote(created.id, created.data()!);
    await trackNoteEvent('note_created', mapped.id);
    return mapped;
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
    requireUserId();
    const ref = firestore().collection(COLLECTIONS.notes).doc(id);
    await ref.update({
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.markdown !== undefined && { markdown: updates.markdown }),
      ...(updates.visibility !== undefined && { visibility: updates.visibility }),
      ...(updates.links !== undefined && { links: updates.links }),
      ...(updates.category !== undefined && { category: updates.category }),
      ...(updates.reminderSchedule !== undefined && { reminderSchedule: updates.reminderSchedule }),
      updatedAt: serverTimestamp(),
    });
    const updated = await ref.get();
    const mapped = this.mapNote(updated.id, updated.data()!);
    await trackNoteEvent('note_updated', mapped.id);
    return mapped;
  }

  async deleteNote(id: string): Promise<void> {
    requireUserId();
    await firestore().collection(COLLECTIONS.notes).doc(id).delete();
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