import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { todoRepository } from '@/repositories/TodoRepository';
import { useSyncStatus } from '@/services/sync-engine';
import { TodoItem, ID } from '@/types';

export type PriorityFilter = 'all' | 'low' | 'medium' | 'high';
export type StatusFilter = 'all' | 'active' | 'completed';

export const [TodoStoreProvider, useTodoStore] = createContextHook(() => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const syncStatus = useSyncStatus();

  const loadTodos = useCallback(async () => {
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
  }, []);

  const createTodo = useCallback(async (data: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    try {
      const newTodo = await todoRepository.createTodo(data);
      setTodos(prev => [newTodo, ...prev]);
      return newTodo;
    } catch (err) {
      throw err;
    }
  }, []);

  const updateTodo = useCallback(async (id: ID, updates: Partial<Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>) => {
    try {
      const updated = await todoRepository.updateTodo(id, updates);
      setTodos(prev => prev.map(t => t.id === id ? updated : t));
      return updated;
    } catch (err) {
      throw err;
    }
  }, []);

  const toggleTodo = useCallback(async (id: ID) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    try {
      const updated = await todoRepository.toggleTodo(id, !todo.completed);
      setTodos(prev => prev.map(t => t.id === id ? updated : t));
    } catch (err) {
      throw err;
    }
  }, [todos]);

  const deleteTodo = useCallback(async (id: ID) => {
    try {
      await todoRepository.deleteTodo(id);
      setTodos(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      throw err;
    }
  }, []);

  const syncTodos = useCallback(async () => {
    try {
      await todoRepository.syncTodos();
      await loadTodos();
    } catch (err) {
      throw err;
    }
  }, [loadTodos]);

  // Filtered todos
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

    // Sort: incomplete first, then by priority, then by dueDate
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
    loadTodos();
  }, [loadTodos]);

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
