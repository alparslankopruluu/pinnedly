import { TodoItem, ID } from '@/types';
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
import { DEFAULT_CONTENT_CATEGORY, normalizeCategory } from '@/constants/contentCategories';
import { getDefaultReminderSchedule } from '@/constants/reminderDefaults';
import { mapReminderScheduleFromFirestore } from '@/services/entityReminders';
import { trackEntityEvent } from '@/lib/analytics';
import { contentAccessApi } from '@/services/contentAccessApi';

export class TodoRepository {
  private static instance: TodoRepository;

  static getInstance(): TodoRepository {
    if (!TodoRepository.instance) TodoRepository.instance = new TodoRepository();
    return TodoRepository.instance;
  }

  async getTodos(): Promise<TodoItem[]> {
    const uid = requireUserId();
    const snapshot = await getDocs(
      query(collection(getDb(), COLLECTIONS.todos), where('ownerId', '==', uid))
    );
    return snapshot.docs.map((snapshotDoc) => this.mapTodo(snapshotDoc.id, snapshotDoc.data()));
  }

  subscribeToTodos(ownerId: string | null, onTodos: (todos: TodoItem[]) => void): () => void {
    if (!ownerId) {
      onTodos([]);
      return () => undefined;
    }
    const todosQuery = query(
      collection(getDb(), COLLECTIONS.todos),
      where('ownerId', '==', ownerId)
    );

    return onQuerySnapshot(todosQuery, (snapshot) => {
      onTodos(snapshot.docs.map((snapshotDoc) => this.mapTodo(snapshotDoc.id, snapshotDoc.data())));
    });
  }

  async createTodo(todo: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<TodoItem> {
    requireUserId();
    const ref = doc(collection(getDb(), COLLECTIONS.todos)) as { id: string };
    await contentAccessApi.create('todos', ref.id, {
      title: todo.title,
      description: todo.description ?? null,
      completed: todo.completed ?? false,
      priority: todo.priority || 'medium',
      dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
      projectId: todo.projectId ?? null,
      noteId: todo.noteId ?? null,
      category: todo.category ?? DEFAULT_CONTENT_CATEGORY,
      reminderSchedule: todo.reminderSchedule ?? getDefaultReminderSchedule(),
    });
    const created = await getDoc(ref);
    const mapped = this.mapTodo(created.id, created.data()!);
    await trackEntityEvent('todo', 'created', mapped.id);
    return mapped;
  }

  async updateTodo(id: ID, updates: Partial<Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>): Promise<TodoItem> {
    requireUserId();
    const ref = doc(getDb(), COLLECTIONS.todos, id);
    await updateDoc(ref, {
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.completed !== undefined && { completed: updates.completed }),
      ...(updates.priority !== undefined && { priority: updates.priority }),
      ...(updates.dueDate !== undefined && { dueDate: updates.dueDate ? new Date(updates.dueDate) : null }),
      ...(updates.projectId !== undefined && { projectId: updates.projectId || null }),
      ...(updates.noteId !== undefined && { noteId: updates.noteId || null }),
      ...(updates.category !== undefined && { category: updates.category }),
      ...(updates.reminderSchedule !== undefined && { reminderSchedule: updates.reminderSchedule }),
      updatedAt: serverTimestamp(),
    });
    const updated = await getDoc(ref);
    const mapped = this.mapTodo(updated.id, updated.data()!);
    await trackEntityEvent('todo', 'updated', mapped.id);
    return mapped;
  }

  async deleteTodo(id: ID): Promise<void> {
    requireUserId();
    await contentAccessApi.delete('todos', id);
    await trackEntityEvent('todo', 'deleted', id);
  }

  async toggleTodo(id: ID, completed: boolean): Promise<TodoItem> {
    return this.updateTodo(id, { completed });
  }

  async syncTodos(): Promise<void> {
    // Firestore handles sync automatically with offline persistence
  }

  private mapTodo(id: string, data: DocumentData): TodoItem {
    return {
      id,
      title: data.title,
      description: data.description,
      completed: data.completed ?? false,
      priority: data.priority || 'medium',
      dueDate: data.dueDate ? timestampToMillis(data.dueDate) : undefined,
      projectId: data.projectId,
      noteId: data.noteId,
      userId: data.ownerId,
      createdAt: timestampToMillis(data.createdAt),
      updatedAt: timestampToMillis(data.updatedAt),
      category: normalizeCategory(data.category as string | undefined),
      reminderSchedule: mapReminderScheduleFromFirestore(data.reminderSchedule),
    };
  }
}

export const todoRepository = TodoRepository.getInstance();
