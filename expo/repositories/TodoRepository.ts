import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { TodoItem, ID } from '@/types';
import { COLLECTIONS, requireUserId, serverTimestamp, timestampToMillis } from '@/lib/firestore';
import { DEFAULT_CONTENT_CATEGORY, normalizeCategory } from '@/constants/contentCategories';
import { trackEntityEvent } from '@/lib/analytics';

export class TodoRepository {
  private static instance: TodoRepository;

  static getInstance(): TodoRepository {
    if (!TodoRepository.instance) TodoRepository.instance = new TodoRepository();
    return TodoRepository.instance;
  }

  async getTodos(): Promise<TodoItem[]> {
    const uid = requireUserId();
    const snapshot = await firestore().collection(COLLECTIONS.todos).where('ownerId', '==', uid).get();
    return snapshot.docs.map((doc) => this.mapTodo(doc.id, doc.data()));
  }

  subscribeToTodos(ownerId: string | null, onTodos: (todos: TodoItem[]) => void): () => void {
    if (!ownerId) {
      onTodos([]);
      return () => undefined;
    }
    return firestore()
      .collection(COLLECTIONS.todos)
      .where('ownerId', '==', ownerId)
      .onSnapshot((snapshot) => {
        onTodos(snapshot.docs.map((doc) => this.mapTodo(doc.id, doc.data())));
      });
  }

  async createTodo(todo: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<TodoItem> {
    const uid = requireUserId();
    const ref = firestore().collection(COLLECTIONS.todos).doc();
    await ref.set({
      ownerId: uid,
      title: todo.title,
      description: todo.description ?? null,
      completed: todo.completed ?? false,
      priority: todo.priority || 'medium',
      dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
      projectId: todo.projectId ?? null,
      noteId: todo.noteId ?? null,
      category: todo.category ?? DEFAULT_CONTENT_CATEGORY,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const created = await ref.get();
    const mapped = this.mapTodo(created.id, created.data()!);
    await trackEntityEvent('todo', 'created', mapped.id);
    return mapped;
  }

  async updateTodo(id: ID, updates: Partial<Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>): Promise<TodoItem> {
    requireUserId();
    const ref = firestore().collection(COLLECTIONS.todos).doc(id);
    await ref.update({
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.completed !== undefined && { completed: updates.completed }),
      ...(updates.priority !== undefined && { priority: updates.priority }),
      ...(updates.dueDate !== undefined && { dueDate: updates.dueDate ? new Date(updates.dueDate) : null }),
      ...(updates.projectId !== undefined && { projectId: updates.projectId || null }),
      ...(updates.noteId !== undefined && { noteId: updates.noteId || null }),
      ...(updates.category !== undefined && { category: updates.category }),
      updatedAt: serverTimestamp(),
    });
    const updated = await ref.get();
    const mapped = this.mapTodo(updated.id, updated.data()!);
    await trackEntityEvent('todo', 'updated', mapped.id);
    return mapped;
  }

  async deleteTodo(id: ID): Promise<void> {
    requireUserId();
    await firestore().collection(COLLECTIONS.todos).doc(id).delete();
    await trackEntityEvent('todo', 'deleted', id);
  }

  async toggleTodo(id: ID, completed: boolean): Promise<TodoItem> {
    return this.updateTodo(id, { completed });
  }

  async syncTodos(): Promise<void> {
    // Firestore handles sync automatically with offline persistence
  }

  private mapTodo(id: string, data: FirebaseFirestoreTypes.DocumentData): TodoItem {
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
    };
  }
}

export const todoRepository = TodoRepository.getInstance();