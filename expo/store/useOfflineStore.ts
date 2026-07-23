import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { projectRepository } from '@/repositories/ProjectRepository';
import { bookmarkRepository } from '@/repositories/BookmarkRepository';
import { noteRepository } from '@/repositories/NoteRepository';
import { notificationService } from '@/utils/notifications';
import { useAuth } from '@/store/useAuthStore';
import { getCurrentFirebaseUser } from '@/lib/auth';
import { Project, Bookmark, Note } from '@/types';
import { dedupeProjectsById } from '@/utils/projects';
import { recordActivity } from '@/utils/activities';
import {
  cancelEntityReminders,
  rescheduleEntityReminders,
  scheduleEntityReminders,
  normalizeReminderSchedule,
} from '@/services/entityReminders';

export const [ProjectStoreProvider, useProjectStore] = createContextHook(() => {
  const { user, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const syncStatus = useSyncStatus();

  const loadProjects = useCallback(async () => {
    if (!isAuthenticated) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const projectsData = await projectRepository.getProjects();
      setProjects(dedupeProjectsById(projectsData));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load projects';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const createProject = useCallback(async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'tasks' | 'collaborators'>) => {
    try {
      const newProject = await projectRepository.createProject(projectData);
      // Firestore subscription updates the list; optimistic prepend caused duplicate keys.
      recordActivity({
        type: 'project_created',
        title: 'Created project',
        subtitle: newProject.title,
        relatedId: newProject.id,
      });

      if (projectData.deadline) {
        const nudgeTime = new Date(projectData.deadline - 7 * 24 * 60 * 60 * 1000);
        if (nudgeTime > new Date()) {
          await notificationService.scheduleProjectNudge(
            newProject.id,
            newProject.title,
            nudgeTime
          );
        }
      }

      return newProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      throw new Error(errorMessage);
    }
  }, []);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    try {
      const updatedProject = await projectRepository.updateProject(id, updates);
      setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
      return updatedProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project';
      throw new Error(errorMessage);
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    try {
      await projectRepository.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project';
      throw new Error(errorMessage);
    }
  }, []);

  const addTask = useCallback(async (projectId: string, taskData: { title: string; status?: 'todo' | 'in-progress' | 'done'; dueDate?: number; notes?: string; category?: import('@/constants/contentCategories').ContentCategoryId }) => {
    try {
      const newTask = await projectRepository.createTask(projectId, {
        ...taskData,
        status: taskData.status || 'todo'
      });

      if (taskData.dueDate) {
        const reminderTime = new Date(taskData.dueDate - 24 * 60 * 60 * 1000);
        if (reminderTime > new Date()) {
          await notificationService.scheduleTaskReminder(
            newTask.id,
            newTask.title,
            reminderTime
          );
        }
      }

      setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
          return { ...p, tasks: [...p.tasks, newTask] };
        }
        return p;
      }));

      return newTask;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add task';
      throw new Error(errorMessage);
    }
  }, []);

  const updateTask = useCallback(async (taskId: string, updates: { title?: string; status?: 'todo' | 'in-progress' | 'done'; dueDate?: number; notes?: string }) => {
    let rollbackProjects: Project[] | null = null;
    setProjects((prev) => {
      rollbackProjects = prev;
      return prev.map((project) => ({
        ...project,
        tasks: project.tasks.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task
        ),
      }));
    });

    try {
      const updatedTask = await projectRepository.updateTask(taskId, updates);
      setProjects((prev) =>
        prev.map((project) => ({
          ...project,
          tasks: project.tasks.map((task) =>
            task.id === taskId ? updatedTask : task
          ),
        }))
      );
      return updatedTask;
    } catch (err) {
      if (rollbackProjects) {
        setProjects(rollbackProjects);
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      throw new Error(errorMessage);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await projectRepository.deleteTask(taskId);
      setProjects(prev => prev.map(project => ({
        ...project,
        tasks: project.tasks.filter(task => task.id !== taskId)
      })));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
      throw new Error(errorMessage);
    }
  }, []);

  const hydrateProject = useCallback(async (projectId: string) => {
    try {
      const fullProject = await projectRepository.getProject(projectId);
      if (!fullProject) return null;
      setProjects((prev) =>
        dedupeProjectsById(
          prev.some((project) => project.id === projectId)
            ? prev.map((project) => (project.id === projectId ? fullProject : project))
            : [fullProject, ...prev]
        )
      );
      return fullProject;
    } catch (err) {
      console.warn(`Failed to hydrate project ${projectId}:`, err);
      return null;
    }
  }, []);

  const hydrateProjectTasks = useCallback(async (projectIds: string[]) => {
    const uniqueIds = [...new Set(projectIds)];
    await Promise.all(uniqueIds.map((projectId) => hydrateProject(projectId)));
  }, [hydrateProject]);

  const syncProjects = useCallback(async () => {
    await projectRepository.syncProjects();
    await loadProjects();
  }, [loadProjects]);

  const scheduleTaskReminder = useCallback(async (taskId: string, taskTitle: string, reminderTime: Date) => {
    return notificationService.scheduleTaskReminder(taskId, taskTitle, reminderTime);
  }, []);

  const scheduleProjectNudge = useCallback(async (projectId: string, projectTitle: string, nudgeTime: Date) => {
    return notificationService.scheduleProjectNudge(projectId, projectTitle, nudgeTime);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = projectRepository.subscribeToProjects(
      user.id,
      (projectsData) => {
        setProjects((prev) => {
          const incoming = dedupeProjectsById(projectsData);
          return incoming.map((project) => {
            const existing = prev.find((item) => item.id === project.id);
            if (existing?.tasks.length && !project.tasks.length) {
              return { ...project, tasks: existing.tasks, collaborators: existing.collaborators };
            }
            return project;
          });
        });
        setLoading(false);
        setError(null);
      },
      (subscriptionError) => {
        const errorMessage = subscriptionError instanceof Error
          ? subscriptionError.message
          : 'Failed to load projects';
        setError(errorMessage);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [isAuthenticated, user?.id]);

  return useMemo(() => ({
    projects,
    loading,
    error,
    syncStatus,
    loadProjects,
    hydrateProject,
    hydrateProjectTasks,
    createProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    syncProjects,
    scheduleTaskReminder,
    scheduleProjectNudge
  }), [projects, loading, error, syncStatus, loadProjects, hydrateProject, hydrateProjectTasks, createProject, updateProject, deleteProject, addTask, updateTask, deleteTask, syncProjects, scheduleTaskReminder, scheduleProjectNudge]);
});

export const [BookmarkStoreProvider, useBookmarkStore] = createContextHook(() => {
  const { user, isAuthenticated } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const syncStatus = useSyncStatus();

  const loadBookmarks = useCallback(async () => {
    if (!isAuthenticated) {
      setBookmarks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const bookmarksData = await bookmarkRepository.getBookmarks();
      setBookmarks(bookmarksData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load bookmarks';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const createBookmark = useCallback(async (bookmarkData: Omit<Bookmark, 'id' | 'createdAt' | 'openCount' | 'notes' | 'tags' | 'userId'>) => {
    try {
      const transformedBookmark = await bookmarkRepository.createBookmark({
        ...bookmarkData,
        status: bookmarkData.status ?? 'inbox',
        tagNames: bookmarkData.tagNames ?? [],
      });
      // Firestore subscription updates the list; optimistic prepend caused duplicate keys.
      recordActivity({
        type: 'bookmark_added',
        title: 'Added bookmark',
        subtitle: transformedBookmark.title || transformedBookmark.url,
        relatedId: transformedBookmark.id,
      });
      await scheduleEntityReminders({
        entityType: 'bookmark',
        entityId: transformedBookmark.id,
        title: transformedBookmark.title || transformedBookmark.url || 'Bookmark',
        baseTime: transformedBookmark.createdAt,
        schedule: normalizeReminderSchedule(transformedBookmark.reminderSchedule),
      });
      return transformedBookmark;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create bookmark';
      throw new Error(errorMessage);
    }
  }, []);

  const openBookmark = useCallback(async (id: string) => {
    try {
      const updatedBookmark = await bookmarkRepository.incrementOpenCount(id);
      await cancelEntityReminders('bookmark', id);
      setBookmarks(prev => prev.map(b => b.id === id ? updatedBookmark : b));
      return updatedBookmark;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open bookmark';
      throw new Error(errorMessage);
    }
  }, []);

  const updateBookmark = useCallback(async (id: string, updates: Partial<Bookmark>) => {
    try {
      const updatedBookmark = await bookmarkRepository.updateBookmark(id, updates);
      if (updates.status === 'done' || updates.status === 'archived') {
        await cancelEntityReminders('bookmark', id);
      } else if (updates.reminderSchedule) {
        const existing = bookmarks.find((b) => b.id === id);
        await rescheduleEntityReminders({
          entityType: 'bookmark',
          entityId: id,
          title: updatedBookmark.title || updatedBookmark.url || 'Bookmark',
          baseTime: existing?.createdAt ?? updatedBookmark.createdAt,
          schedule: normalizeReminderSchedule(updates.reminderSchedule),
        });
      }
      setBookmarks(prev => prev.map(b => b.id === id ? updatedBookmark : b));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update bookmark';
      throw new Error(errorMessage);
    }
  }, [bookmarks]);

  const deleteBookmark = useCallback(async (id: string) => {
    try {
      await cancelEntityReminders('bookmark', id);
      await bookmarkRepository.deleteBookmark(id);
      setBookmarks(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete bookmark';
      throw new Error(errorMessage);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setBookmarks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = bookmarkRepository.subscribeToBookmarks(user.id, (bookmarksData) => {
      setBookmarks(bookmarksData);
      setLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, [isAuthenticated, user?.id]);

  return useMemo(() => ({
    bookmarks,
    loading,
    error,
    syncStatus,
    loadBookmarks,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    openBookmark,
  }), [bookmarks, loading, error, syncStatus, loadBookmarks, createBookmark, updateBookmark, deleteBookmark, openBookmark]);
});

export const [NoteStoreProvider, useNoteStore] = createContextHook(() => {
  const { user, isAuthenticated, isGuest } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const syncStatus = useSyncStatus();

  const hasNoteAccess = isAuthenticated || isGuest;
  const ownerId = isAuthenticated
    ? (user?.id ?? null)
    : (isGuest ? (getCurrentFirebaseUser()?.uid ?? null) : null);

  const loadNotes = useCallback(async () => {
    if (!hasNoteAccess) {
      setNotes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const notesData = await noteRepository.getNotes();
      setNotes(notesData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notes';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [hasNoteAccess]);

  const createNote = useCallback(async (
    noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'links'> & {
      links?: Note['links'];
    }
  ) => {
    try {
      const transformedNote = await noteRepository.createNote(noteData);
      // Firestore subscription updates the list; optimistic prepend caused duplicate keys.
      recordActivity({
        type: 'note_added',
        title: 'Added note',
        subtitle: transformedNote.title,
        relatedId: transformedNote.id,
      });
      await scheduleEntityReminders({
        entityType: 'note',
        entityId: transformedNote.id,
        title: transformedNote.title,
        baseTime: transformedNote.createdAt,
        schedule: normalizeReminderSchedule(transformedNote.reminderSchedule),
      });
      return transformedNote;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create note';
      throw new Error(errorMessage);
    }
  }, []);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
    try {
      const updatedNote = await noteRepository.updateNote(id, updates);
      if (updates.reminderSchedule) {
        const existing = notes.find((n) => n.id === id);
        await rescheduleEntityReminders({
          entityType: 'note',
          entityId: id,
          title: updatedNote.title,
          baseTime: existing?.createdAt ?? updatedNote.createdAt,
          schedule: normalizeReminderSchedule(updates.reminderSchedule),
        });
      }
      setNotes(prev => prev.map(n => n.id === id ? updatedNote : n));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update note';
      throw new Error(errorMessage);
    }
  }, [notes]);

  const deleteNote = useCallback(async (id: string) => {
    try {
      await cancelEntityReminders('note', id);
      await noteRepository.deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete note';
      throw new Error(errorMessage);
    }
  }, []);

  useEffect(() => {
    if (!hasNoteAccess || !ownerId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = noteRepository.subscribeToNotes(ownerId, (notesData) => {
      setNotes(notesData);
      setLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, [hasNoteAccess, ownerId]);

  return useMemo(() => ({
    notes,
    loading,
    error,
    syncStatus,
    loadNotes,
    createNote,
    updateNote,
    deleteNote
  }), [notes, loading, error, syncStatus, loadNotes, createNote, updateNote, deleteNote]);
});
