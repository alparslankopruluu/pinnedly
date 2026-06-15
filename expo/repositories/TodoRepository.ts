import { supabase } from '@/lib/supabase';
import { syncEngine } from '@/services/sync-engine';
import { TodoItem, ID } from '@/types';

export class TodoRepository {
  private static instance: TodoRepository;

  public static getInstance(): TodoRepository {
    if (!TodoRepository.instance) {
      TodoRepository.instance = new TodoRepository();
    }
    return TodoRepository.instance;
  }

  async getTodos(): Promise<TodoItem[]> {
    try {
      const todosData = await syncEngine.getData('todos');
      return todosData.map(this.mapTodoFromDB);
    } catch (error) {
      console.error('Error fetching todos:', error);
      return [];
    }
  }

  async createTodo(todo: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<TodoItem> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const todoData = {
        title: todo.title,
        description: todo.description || null,
        completed: todo.completed ?? false,
        priority: todo.priority || 'medium',
        due_date: todo.dueDate ? new Date(todo.dueDate).toISOString() : null,
        project_id: todo.projectId || null,
        note_id: todo.noteId || null,
        owner_id: user.id,
      };

      const created = await syncEngine.createData('todos', todoData);
      return this.mapTodoFromDB(created);
    } catch (error) {
      console.error('Error creating todo:', error);
      throw new Error('Failed to create todo');
    }
  }

  async updateTodo(id: ID, updates: Partial<Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>): Promise<TodoItem> {
    try {
      const updateData: Record<string, unknown> = {};

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.completed !== undefined) updateData.completed = updates.completed;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.dueDate !== undefined) {
        updateData.due_date = updates.dueDate ? new Date(updates.dueDate).toISOString() : null;
      }
      if (updates.projectId !== undefined) updateData.project_id = updates.projectId || null;
      if (updates.noteId !== undefined) updateData.note_id = updates.noteId || null;

      const updated = await syncEngine.updateData('todos', id, updateData);
      return this.mapTodoFromDB(updated);
    } catch (error) {
      console.error('Error updating todo:', error);
      throw new Error('Failed to update todo');
    }
  }

  async deleteTodo(id: ID): Promise<void> {
    try {
      await syncEngine.deleteData('todos', id);
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw new Error('Failed to delete todo');
    }
  }

  async toggleTodo(id: ID, completed: boolean): Promise<TodoItem> {
    return this.updateTodo(id, { completed });
  }

  async syncTodos(): Promise<void> {
    try {
      await syncEngine.syncFromRemote('todos');
    } catch (error) {
      console.error('Error syncing todos:', error);
      throw new Error('Failed to sync todos');
    }
  }

  private mapTodoFromDB(data: Record<string, unknown>): TodoItem {
    return {
      id: data.id as ID,
      title: data.title as string,
      description: data.description as string | undefined,
      completed: (data.completed as boolean) ?? false,
      priority: (data.priority as TodoItem['priority']) || 'medium',
      dueDate: data.due_date ? new Date(data.due_date as string).getTime() : undefined,
      projectId: data.project_id as ID | undefined,
      noteId: data.note_id as ID | undefined,
      userId: data.owner_id as ID,
      createdAt: new Date(data.created_at as string).getTime(),
      updatedAt: new Date(data.updated_at as string).getTime(),
    };
  }
}

export const todoRepository = TodoRepository.getInstance();
