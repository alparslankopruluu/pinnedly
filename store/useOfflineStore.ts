import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { syncEngine, useSyncStatus } from '@/services/sync-engine';
import { projectRepository } from '@/repositories/ProjectRepository';
import { Project, Bookmark, Note } from '@/types';

export const [ProjectStoreProvider, useProjectStore] = createContextHook(() => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const syncStatus = useSyncStatus();

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading projects from repository...');
      const projectsData = await projectRepository.getProjects();
      setProjects(projectsData);
      
      console.log(`Loaded ${projectsData.length} projects`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load projects';
      console.error('Error loading projects:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'tasks' | 'collaborators'>) => {
    try {
      console.log('Creating new project:', projectData.title);
      
      const newProject = await projectRepository.createProject(projectData);
      setProjects(prev => [newProject, ...prev]);
      
      console.log('Project created successfully:', newProject.id);
      return newProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      console.error('Error creating project:', errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    try {
      console.log('Updating project:', id);
      
      const updatedProject = await projectRepository.updateProject(id, updates);
      setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
      
      console.log('Project updated successfully:', id);
      return updatedProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project';
      console.error('Error updating project:', errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    try {
      console.log('Deleting project:', id);
      
      await projectRepository.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      
      console.log('Project deleted successfully:', id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project';
      console.error('Error deleting project:', errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const addTask = useCallback(async (projectId: string, taskData: { title: string; status?: 'todo' | 'in-progress' | 'done'; dueDate?: number; notes?: string }) => {
    try {
      console.log('Adding task to project:', projectId);
      
      const newTask = await projectRepository.createTask(projectId, {
        ...taskData,
        status: taskData.status || 'todo'
      });
      
      // Update the project in local state
      setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
          return { ...p, tasks: [...p.tasks, newTask] };
        }
        return p;
      }));
      
      console.log('Task added successfully:', newTask.id);
      return newTask;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add task';
      console.error('Error adding task:', errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateTask = useCallback(async (taskId: string, updates: { title?: string; status?: 'todo' | 'in-progress' | 'done'; dueDate?: number; notes?: string }) => {
    try {
      console.log('Updating task:', taskId);
      
      const updatedTask = await projectRepository.updateTask(taskId, updates);
      
      // Update the task in local state
      setProjects(prev => prev.map(project => ({
        ...project,
        tasks: project.tasks.map(task => task.id === taskId ? updatedTask : task)
      })));
      
      console.log('Task updated successfully:', taskId);
      return updatedTask;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      console.error('Error updating task:', errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      console.log('Deleting task:', taskId);
      
      await projectRepository.deleteTask(taskId);
      
      // Remove the task from local state
      setProjects(prev => prev.map(project => ({
        ...project,
        tasks: project.tasks.filter(task => task.id !== taskId)
      })));
      
      console.log('Task deleted successfully:', taskId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
      console.error('Error deleting task:', errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const syncProjects = useCallback(async () => {
    try {
      console.log('Syncing projects...');
      await projectRepository.syncProjects();
      await loadProjects(); // Reload after sync
      console.log('Projects synced successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync projects';
      console.error('Error syncing projects:', errorMessage);
      throw new Error(errorMessage);
    }
  }, [loadProjects]);

  // Load projects on mount and when sync status changes
  useEffect(() => {
    loadProjects();
  }, [syncStatus.isOnline, loadProjects]);

  return useMemo(() => ({
    projects,
    loading,
    error,
    syncStatus,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    syncProjects
  }), [projects, loading, error, syncStatus, loadProjects, createProject, updateProject, deleteProject, addTask, updateTask, deleteTask, syncProjects]);
});

// Bookmark Store with offline-first approach
export const [BookmarkStoreProvider, useBookmarkStore] = createContextHook(() => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const syncStatus = useSyncStatus();

  const loadBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading bookmarks...');
      const bookmarksData = await syncEngine.getData('bookmarks');
      
      // Transform Supabase data to app format
      const transformedBookmarks = bookmarksData.map((bookmark: any) => ({
        id: bookmark.id,
        url: bookmark.url,
        title: bookmark.title,
        description: bookmark.description,
        imagePreview: bookmark.image_preview,
        screenshotUri: bookmark.screenshot_uri,
        notes: [], // Will be populated separately if needed
        tags: [], // Will be populated separately if needed
        createdAt: new Date(bookmark.created_at).getTime(),
        openCount: bookmark.open_count || 0,
        lastOpenedAt: bookmark.last_opened_at ? new Date(bookmark.last_opened_at).getTime() : undefined,
        source: bookmark.source,
        userId: bookmark.owner_id,
        visibility: bookmark.visibility
      }));
      
      setBookmarks(transformedBookmarks);
      console.log(`Loaded ${transformedBookmarks.length} bookmarks`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load bookmarks';
      console.error('Error loading bookmarks:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const createBookmark = useCallback(async (bookmarkData: Omit<Bookmark, 'id' | 'createdAt' | 'openCount' | 'notes' | 'tags' | 'userId'>) => {
    try {
      console.log('Creating new bookmark:', bookmarkData.title);
      
      const newBookmarkData = {
        url: bookmarkData.url,
        title: bookmarkData.title,
        description: bookmarkData.description,
        image_preview: bookmarkData.imagePreview,
        screenshot_uri: bookmarkData.screenshotUri,
        source: bookmarkData.source,
        visibility: bookmarkData.visibility || 'private'
      };
      
      const createdBookmark = await syncEngine.createData('bookmarks', newBookmarkData);
      
      const transformedBookmark: Bookmark = {
        id: createdBookmark.id,
        url: createdBookmark.url,
        title: createdBookmark.title,
        description: createdBookmark.description,
        imagePreview: createdBookmark.image_preview,
        screenshotUri: createdBookmark.screenshot_uri,
        notes: [],
        tags: [],
        createdAt: new Date(createdBookmark.created_at).getTime(),
        openCount: 0,
        lastOpenedAt: undefined,
        source: createdBookmark.source,
        userId: createdBookmark.owner_id,
        visibility: createdBookmark.visibility
      };
      
      setBookmarks(prev => [transformedBookmark, ...prev]);
      console.log('Bookmark created successfully:', transformedBookmark.id);
      return transformedBookmark;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create bookmark';
      console.error('Error creating bookmark:', errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateBookmark = useCallback(async (id: string, updates: Partial<Bookmark>) => {
    try {
      console.log('Updating bookmark:', id);
      
      const updateData: any = {};
      if (updates.url !== undefined) updateData.url = updates.url;
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.imagePreview !== undefined) updateData.image_preview = updates.imagePreview;
      if (updates.screenshotUri !== undefined) updateData.screenshot_uri = updates.screenshotUri;
      if (updates.source !== undefined) updateData.source = updates.source;
      if (updates.visibility !== undefined) updateData.visibility = updates.visibility;
      if (updates.openCount !== undefined) updateData.open_count = updates.openCount;
      if (updates.lastOpenedAt !== undefined) updateData.last_opened_at = new Date(updates.lastOpenedAt).toISOString();
      
      const updatedBookmark = await syncEngine.updateData('bookmarks', id, updateData);
      
      setBookmarks(prev => prev.map(b => {
        if (b.id === id) {
          return {
            ...b,
            ...updates,
            updatedAt: new Date(updatedBookmark.updated_at).getTime()
          };
        }
        return b;
      }));
      
      console.log('Bookmark updated successfully:', id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update bookmark';
      console.error('Error updating bookmark:', errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteBookmark = useCallback(async (id: string) => {
    try {
      console.log('Deleting bookmark:', id);
      
      await syncEngine.deleteData('bookmarks', id);
      setBookmarks(prev => prev.filter(b => b.id !== id));
      
      console.log('Bookmark deleted successfully:', id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete bookmark';
      console.error('Error deleting bookmark:', errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  useEffect(() => {
    loadBookmarks();
  }, [syncStatus.isOnline, loadBookmarks]);

  return useMemo(() => ({
    bookmarks,
    loading,
    error,
    syncStatus,
    loadBookmarks,
    createBookmark,
    updateBookmark,
    deleteBookmark
  }), [bookmarks, loading, error, syncStatus, loadBookmarks, createBookmark, updateBookmark, deleteBookmark]);
});

// Notes Store with offline-first approach
export const [NoteStoreProvider, useNoteStore] = createContextHook(() => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const syncStatus = useSyncStatus();

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading notes...');
      const notesData = await syncEngine.getData('notes');
      
      // Transform Supabase data to app format
      const transformedNotes = notesData.map((note: any) => ({
        id: note.id,
        title: note.title,
        markdown: note.markdown,
        links: [], // Will be populated separately if needed
        createdAt: new Date(note.created_at).getTime(),
        updatedAt: new Date(note.updated_at).getTime(),
        userId: note.owner_id,
        visibility: note.visibility
      }));
      
      setNotes(transformedNotes);
      console.log(`Loaded ${transformedNotes.length} notes`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notes';
      console.error('Error loading notes:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const createNote = useCallback(async (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'links' | 'userId'>) => {
    try {
      console.log('Creating new note:', noteData.title);
      
      const newNoteData = {
        title: noteData.title,
        markdown: noteData.markdown,
        visibility: noteData.visibility || 'private'
      };
      
      const createdNote = await syncEngine.createData('notes', newNoteData);
      
      const transformedNote: Note = {
        id: createdNote.id,
        title: createdNote.title,
        markdown: createdNote.markdown,
        links: [],
        createdAt: new Date(createdNote.created_at).getTime(),
        updatedAt: new Date(createdNote.updated_at).getTime(),
        userId: createdNote.owner_id,
        visibility: createdNote.visibility
      };
      
      setNotes(prev => [transformedNote, ...prev]);
      console.log('Note created successfully:', transformedNote.id);
      return transformedNote;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create note';
      console.error('Error creating note:', errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
    try {
      console.log('Updating note:', id);
      
      const updateData: any = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.markdown !== undefined) updateData.markdown = updates.markdown;
      if (updates.visibility !== undefined) updateData.visibility = updates.visibility;
      
      const updatedNote = await syncEngine.updateData('notes', id, updateData);
      
      setNotes(prev => prev.map(n => {
        if (n.id === id) {
          return {
            ...n,
            ...updates,
            updatedAt: new Date(updatedNote.updated_at).getTime()
          };
        }
        return n;
      }));
      
      console.log('Note updated successfully:', id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update note';
      console.error('Error updating note:', errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    try {
      console.log('Deleting note:', id);
      
      await syncEngine.deleteData('notes', id);
      setNotes(prev => prev.filter(n => n.id !== id));
      
      console.log('Note deleted successfully:', id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete note';
      console.error('Error deleting note:', errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [syncStatus.isOnline, loadNotes]);

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