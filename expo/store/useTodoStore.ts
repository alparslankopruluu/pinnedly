import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { todoRepository } from '@/repositories/TodoRepository';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useAuth } from '@/store/useAuthStore';
import { TodoItem, ID } from '@/types';
import {
  cancelEntityReminders,
  rescheduleEntityReminders,
  scheduleEntityReminders,
  normalizeReminderSchedule,
} from '@/services/entityReminders';

export type PriorityFilter = 'all' | 'low' | 'medium' | 'high';
export type StatusFilter = 'all' | 'active' | 'completed';

export const [TodoStoreProvider, useTodoStore] = createContextHook(() => {
  const { user, isAuthenticated } = useAuth();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const syncStatus = useSyncStatus();

  const loadTodos = useCallback(async () => {
    if (!isAuthenticated) {
      setTodos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const todosData = await todoRepository.getTodos();
      setTodos(todosData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load todos';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const createTodo = useCallback(async (data: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    const created = await todoRepository.createTodo(data);
    await scheduleEntityReminders({
      entityType: 'todo',
      entityId: created.id,
      title: created.title,
      baseTime: created.createdAt,
      schedule: normalizeReminderSchedule(created.reminderSchedule),
    });
    return created;
  }, []);

  const updateTodo = useCallback(async (id: ID, updates: Partial<Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>) => {
    const updated = await todoRepository.updateTodo(id, updates);
    if (updates.reminderSchedule) {
      const existing = todos.find((t) => t.id === id);
      await rescheduleEntityReminders({
        entityType: 'todo',
        entityId: id,
        title: updated.title,
        baseTime: existing?.createdAt ?? updated.createdAt,
        schedule: normalizeReminderSchedule(updates.reminderSchedule),
      });
    }
    return updated;
  }, [todos]);

  const toggleTodo = useCallback(async (id: ID) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    const updated = await todoRepository.toggleTodo(id, !todo.completed);
    if (updated.completed) {
      await cancelEntityReminders('todo', id);
    }
    return updated;
  }, [todos]);

  const deleteTodo = useCallback(async (id: ID) => {
    await cancelEntityReminders('todo', id);
    await todoRepository.deleteTodo(id);
  }, []);

  const syncTodos = useCallback(async () => {
    await todoRepository.syncTodos();
    await loadTodos();
  }, [loadTodos]);

  const filteredTodos = useMemo(() => {
    let result = todos;

    if (statusFilter === 'active') {
      result = result.filter(t => !t.completed);
    } else if (statusFilter === 'completed') {
      result = result.filter(t => t.completed);
    }

    if (priorityFilter !== 'all') {
      result = result.filter(t => t.priority === priorityFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false)
      );
    }

    return result.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const pa = priorityOrder[a.priority] ?? 2;
      const pb = priorityOrder[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.createdAt - a.createdAt;
    });
  }, [todos, statusFilter, priorityFilter, searchQuery]);

  const counts = useMemo(() => ({
    total: todos.length,
    active: todos.filter(t => !t.completed).length,
    completed: todos.filter(t => t.completed).length,
    high: todos.filter(t => t.priority === 'high').length,
  }), [todos]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setTodos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = todoRepository.subscribeToTodos(user.id, (todosData) => {
      setTodos(todosData);
      setLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, [isAuthenticated, user?.id]);

  return useMemo(() => ({
    todos: filteredTodos,
    allTodos: todos,
    loading,
    error,
    syncStatus,
    priorityFilter,
    statusFilter,
    searchQuery,
    counts,
    setPriorityFilter,
    setStatusFilter,
    setSearchQuery,
    loadTodos,
    createTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    syncTodos,
  }), [filteredTodos, todos, loading, error, syncStatus, priorityFilter, statusFilter, searchQuery, counts, loadTodos, createTodo, updateTodo, toggleTodo, deleteTodo, syncTodos]);
});