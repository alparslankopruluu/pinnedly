import { create } from 'zustand';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { Project, Task, User, ProjectCollaborator, ID } from '@/types';

interface ProjectState {
  // Data
  projects: Project[];
  currentProject: Project | null;
  projectMembers: ProjectCollaborator[];
  searchResults: User[];
  
  // Loading states
  isLoading: boolean;
  isCreatingTask: boolean;
  isUpdatingTask: boolean;
  isManagingMembers: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'tasks' | 'collaborators'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  
  // Task actions
  createTask: (projectId: string, task: Omit<Task, 'id' | 'projectId'>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  assignTask: (taskId: string, userId: string | null) => Promise<void>;
  
  // Member management actions
  loadProjectMembers: (projectId: string) => Promise<void>;
  addProjectMember: (projectId: string, userEmail: string, permission: 'view' | 'edit') => Promise<void>;
  removeProjectMember: (projectId: string, userId: string) => Promise<void>;
  updateMemberPermission: (projectId: string, userId: string, permission: 'view' | 'edit') => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  
  // Utility actions
  clearError: () => void;
  clearSearchResults: () => void;
}

const projectRepository = new ProjectRepository();

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Initial state
  projects: [],
  currentProject: null,
  projectMembers: [],
  searchResults: [],
  isLoading: false,
  isCreatingTask: false,
  isUpdatingTask: false,
  isManagingMembers: false,
  error: null,

  // Actions
  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await projectRepository.getProjects();
      set({ projects, isLoading: false });
    } catch (error) {
      console.error('Failed to load projects:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load projects',
        isLoading: false 
      });
    }
  },

  loadProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const project = await projectRepository.getProject(id);
      set({ currentProject: project, isLoading: false });
    } catch (error) {
      console.error('Failed to load project:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load project',
        isLoading: false 
      });
    }
  },

  createProject: async (projectData) => {
    set({ isLoading: true, error: null });
    try {
      const project = await projectRepository.createProject(projectData);
      set((state) => ({ 
        projects: [project, ...state.projects],
        isLoading: false 
      }));
    } catch (error) {
      console.error('Failed to create project:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create project',
        isLoading: false 
      });
    }
  },

  updateProject: async (id: string, updates: Partial<Project>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedProject = await projectRepository.updateProject(id, updates);
      set((state) => ({
        projects: state.projects.map((p) => p.id === id ? updatedProject : p),
        currentProject: state.currentProject?.id === id ? updatedProject : state.currentProject,
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to update project:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update project',
        isLoading: false 
      });
    }
  },

  deleteProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await projectRepository.deleteProject(id);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to delete project:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete project',
        isLoading: false 
      });
    }
  },

  createTask: async (projectId: string, taskData: Omit<Task, 'id' | 'projectId'>) => {
    set({ isCreatingTask: true, error: null });
    try {
      const task = await projectRepository.createTask(projectId, taskData);
      
      set((state) => {
        const updatedProjects = state.projects.map((p) => 
          p.id === projectId 
            ? { ...p, tasks: [...p.tasks, task] }
            : p
        );
        
        const updatedCurrentProject = state.currentProject?.id === projectId
          ? { ...state.currentProject, tasks: [...state.currentProject.tasks, task] }
          : state.currentProject;

        return {
          projects: updatedProjects,
          currentProject: updatedCurrentProject,
          isCreatingTask: false
        };
      });
    } catch (error) {
      console.error('Failed to create task:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create task',
        isCreatingTask: false 
      });
    }
  },

  updateTask: async (taskId: string, updates: Partial<Task>) => {
    set({ isUpdatingTask: true, error: null });
    try {
      const updatedTask = await projectRepository.updateTask(taskId, updates);
      
      set((state) => {
        const updateTaskInProject = (project: Project) => ({
          ...project,
          tasks: project.tasks.map((t) => t.id === taskId ? updatedTask : t)
        });

        return {
          projects: state.projects.map(updateTaskInProject),
          currentProject: state.currentProject ? updateTaskInProject(state.currentProject) : null,
          isUpdatingTask: false
        };
      });
    } catch (error) {
      console.error('Failed to update task:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update task',
        isUpdatingTask: false 
      });
    }
  },

  deleteTask: async (taskId: string) => {
    set({ isUpdatingTask: true, error: null });
    try {
      await projectRepository.deleteTask(taskId);
      
      set((state) => {
        const removeTaskFromProject = (project: Project) => ({
          ...project,
          tasks: project.tasks.filter((t) => t.id !== taskId)
        });

        return {
          projects: state.projects.map(removeTaskFromProject),
          currentProject: state.currentProject ? removeTaskFromProject(state.currentProject) : null,
          isUpdatingTask: false
        };
      });
    } catch (error) {
      console.error('Failed to delete task:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete task',
        isUpdatingTask: false 
      });
    }
  },

  assignTask: async (taskId: string, userId: string | null) => {
    set({ isUpdatingTask: true, error: null });
    try {
      const updatedTask = await projectRepository.assignTask(taskId, userId);
      
      set((state) => {
        const updateTaskInProject = (project: Project) => ({
          ...project,
          tasks: project.tasks.map((t) => t.id === taskId ? updatedTask : t)
        });

        return {
          projects: state.projects.map(updateTaskInProject),
          currentProject: state.currentProject ? updateTaskInProject(state.currentProject) : null,
          isUpdatingTask: false
        };
      });
    } catch (error) {
      console.error('Failed to assign task:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to assign task',
        isUpdatingTask: false 
      });
    }
  },

  loadProjectMembers: async (projectId: string) => {
    set({ isManagingMembers: true, error: null });
    try {
      const members = await projectRepository.getProjectMembers(projectId);
      set({ projectMembers: members, isManagingMembers: false });
    } catch (error) {
      console.error('Failed to load project members:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load project members',
        isManagingMembers: false 
      });
    }
  },

  addProjectMember: async (projectId: string, userEmail: string, permission: 'view' | 'edit') => {
    if (!userEmail.trim()) {
      set({ error: 'Email is required' });
      return;
    }
    
    if (userEmail.length > 100) {
      set({ error: 'Email is too long' });
      return;
    }

    const sanitizedEmail = userEmail.trim();
    
    set({ isManagingMembers: true, error: null });
    try {
      const member = await projectRepository.addProjectMember(projectId, sanitizedEmail, permission);
      set((state) => ({ 
        projectMembers: [...state.projectMembers, member],
        isManagingMembers: false 
      }));
    } catch (error) {
      console.error('Failed to add project member:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add project member',
        isManagingMembers: false 
      });
    }
  },

  removeProjectMember: async (projectId: string, userId: string) => {
    set({ isManagingMembers: true, error: null });
    try {
      await projectRepository.removeProjectMember(projectId, userId);
      set((state) => ({ 
        projectMembers: state.projectMembers.filter((m) => m.userId !== userId),
        isManagingMembers: false 
      }));
    } catch (error) {
      console.error('Failed to remove project member:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to remove project member',
        isManagingMembers: false 
      });
    }
  },

  updateMemberPermission: async (projectId: string, userId: string, permission: 'view' | 'edit') => {
    set({ isManagingMembers: true, error: null });
    try {
      const updatedMember = await projectRepository.updateProjectMemberPermission(projectId, userId, permission);
      set((state) => ({ 
        projectMembers: state.projectMembers.map((m) => 
          m.userId === userId ? updatedMember : m
        ),
        isManagingMembers: false 
      }));
    } catch (error) {
      console.error('Failed to update member permission:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update member permission',
        isManagingMembers: false 
      });
    }
  },

  searchUsers: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }

    try {
      const users = await projectRepository.searchUsersByEmail(query.trim());
      set({ searchResults: users });
    } catch (error) {
      console.error('Failed to search users:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to search users',
        searchResults: [] 
      });
    }
  },

  clearError: () => set({ error: null }),
  clearSearchResults: () => set({ searchResults: [] }),
}));