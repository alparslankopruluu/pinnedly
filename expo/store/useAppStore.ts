import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bookmark, Project, Note, Task, Tag, ActivityItem, Preferences, ID } from '@/types';

interface AppState {
  // Data
  bookmarks: Bookmark[];
  projects: Project[];
  notes: Note[];
  tags: Tag[];
  activities: ActivityItem[];
  preferences: Preferences;
  
  // Loading states
  isLoading: boolean;
  
  // Actions
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'openCount' | 'notes'>) => void;
  updateBookmark: (id: ID, updates: Partial<Bookmark>) => void;
  deleteBookmark: (id: ID) => void;
  openBookmark: (id: ID) => void;
  
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'tasks'>) => void;
  updateProject: (id: ID, updates: Partial<Project>) => void;
  deleteProject: (id: ID) => void;
  
  addTask: (projectId: ID, task: Omit<Task, 'id' | 'projectId'>) => void;
  updateTask: (taskId: ID, updates: Partial<Task>) => void;
  deleteTask: (taskId: ID) => void;
  
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNote: (id: ID, updates: Partial<Note>) => void;
  deleteNote: (id: ID) => void;
  
  addTag: (tag: Omit<Tag, 'id'>) => void;
  deleteTag: (id: ID) => void;
  
  addActivity: (activity: Omit<ActivityItem, 'id' | 'timestamp'>) => void;
  
  updatePreferences: (updates: Partial<Preferences>) => void;
  
  // Persistence
  loadData: () => Promise<void>;
  saveData: () => Promise<void>;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const defaultPreferences: Preferences = {
  theme: 'light',
  dailyGoal: 3,
  weeklyGoal: 20,
  notificationsEnabled: true,
};

export const useAppStore = create<AppState>((set, get) => ({
  bookmarks: [],
  projects: [],
  notes: [],
  tags: [],
  activities: [],
  preferences: defaultPreferences,
  isLoading: false,

  addBookmark: (bookmarkData) => {
    const tagNames = bookmarkData.tagNames ?? bookmarkData.tags?.map((t) => t.name) ?? [];
    const bookmark: Bookmark = {
      ...bookmarkData,
      id: generateId(),
      createdAt: Date.now(),
      openCount: 0,
      notes: [],
      tagNames,
      status: bookmarkData.status ?? 'inbox',
    };
    
    set((state) => ({
      bookmarks: [bookmark, ...state.bookmarks],
    }));
    
    get().addActivity({
      type: 'bookmark_added',
      title: 'Added bookmark',
      subtitle: bookmark.title || bookmark.url,
      relatedId: bookmark.id,
    });
    
    get().saveData();
  },

  updateBookmark: (id, updates) => {
    set((state) => ({
      bookmarks: state.bookmarks.map((bookmark) =>
        bookmark.id === id ? { ...bookmark, ...updates } : bookmark
      ),
    }));
    get().saveData();
  },

  deleteBookmark: (id) => {
    set((state) => ({
      bookmarks: state.bookmarks.filter((bookmark) => bookmark.id !== id),
    }));
    get().saveData();
  },

  openBookmark: (id) => {
    const bookmark = get().bookmarks.find((b) => b.id === id);
    if (bookmark) {
      get().updateBookmark(id, {
        openCount: bookmark.openCount + 1,
        lastOpenedAt: Date.now(),
      });
      
      get().addActivity({
        type: 'bookmark_opened',
        title: 'Opened bookmark',
        subtitle: bookmark.title || bookmark.url,
        relatedId: id,
      });
    }
  },

  addProject: (projectData) => {
    const project: Project = {
      ...projectData,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tasks: [],
    };
    
    set((state) => ({
      projects: [project, ...state.projects],
    }));
    
    get().addActivity({
      type: 'project_created',
      title: 'Created project',
      subtitle: project.title,
      relatedId: project.id,
    });
    
    get().saveData();
  },

  updateProject: (id, updates) => {
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id ? { ...project, ...updates, updatedAt: Date.now() } : project
      ),
    }));
    get().saveData();
  },

  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
    }));
    get().saveData();
  },

  addTask: (projectId, taskData) => {
    const task: Task = {
      ...taskData,
      id: generateId(),
      projectId,
    };
    
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId
          ? { ...project, tasks: [...project.tasks, task], updatedAt: Date.now() }
          : project
      ),
    }));
    
    get().saveData();
  },

  updateTask: (taskId, updates) => {
    set((state) => ({
      projects: state.projects.map((project) => ({
        ...project,
        tasks: project.tasks.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task
        ),
        updatedAt: Date.now(),
      })),
    }));
    
    if (updates.status === 'done') {
      const task = get().projects
        .flatMap((p) => p.tasks)
        .find((t) => t.id === taskId);
      
      if (task) {
        get().addActivity({
          type: 'task_completed',
          title: 'Completed task',
          subtitle: task.title,
          relatedId: taskId,
        });
      }
    }
    
    get().saveData();
  },

  deleteTask: (taskId) => {
    set((state) => ({
      projects: state.projects.map((project) => ({
        ...project,
        tasks: project.tasks.filter((task) => task.id !== taskId),
        updatedAt: Date.now(),
      })),
    }));
    get().saveData();
  },

  addNote: (noteData) => {
    const note: Note = {
      ...noteData,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    set((state) => ({
      notes: [note, ...state.notes],
    }));
    
    get().addActivity({
      type: 'note_added',
      title: 'Added note',
      subtitle: note.title,
      relatedId: note.id,
    });
    
    get().saveData();
  },

  updateNote: (id, updates) => {
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id ? { ...note, ...updates, updatedAt: Date.now() } : note
      ),
    }));
    get().saveData();
  },

  deleteNote: (id) => {
    set((state) => ({
      notes: state.notes.filter((note) => note.id !== id),
    }));
    get().saveData();
  },

  addTag: (tagData) => {
    const tag: Tag = {
      ...tagData,
      id: generateId(),
    };
    
    set((state) => ({
      tags: [...state.tags, tag],
    }));
    get().saveData();
  },

  deleteTag: (id) => {
    set((state) => ({
      tags: state.tags.filter((tag) => tag.id !== id),
    }));
    get().saveData();
  },

  addActivity: (activityData) => {
    const activity: ActivityItem = {
      ...activityData,
      id: generateId(),
      timestamp: Date.now(),
    };
    
    set((state) => ({
      activities: [activity, ...state.activities.slice(0, 49)], // Keep last 50
    }));
  },

  updatePreferences: (updates) => {
    set((state) => ({
      preferences: { ...state.preferences, ...updates },
    }));
    get().saveData();
  },

  loadData: async () => {
    set({ isLoading: true });
    try {
      const data = await AsyncStorage.getItem('app_data');
      if (data) {
        const parsed = JSON.parse(data);
        set({
          bookmarks: parsed.bookmarks || [],
          projects: parsed.projects || [],
          notes: parsed.notes || [],
          tags: parsed.tags || [],
          activities: parsed.activities || [],
          preferences: { ...defaultPreferences, ...parsed.preferences },
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  saveData: async () => {
    try {
      const { bookmarks, projects, notes, tags, activities, preferences } = get();
      const data = {
        bookmarks,
        projects,
        notes,
        tags,
        activities,
        preferences,
      };
      await AsyncStorage.setItem('app_data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  },
}));