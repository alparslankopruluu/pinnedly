import { supabase, Database } from '@/lib/supabase';
import { syncEngine } from '@/services/sync-engine';
import { Project, Task, User, ProjectCollaborator } from '@/types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];
type TaskRow = Database['public']['Tables']['tasks']['Row'];
type ProjectMemberRow = Database['public']['Tables']['project_members']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export class ProjectRepository {
  private static instance: ProjectRepository;
  
  public static getInstance(): ProjectRepository {
    if (!ProjectRepository.instance) {
      ProjectRepository.instance = new ProjectRepository();
    }
    return ProjectRepository.instance;
  }

  async getProjects(): Promise<Project[]> {
    try {
      console.log('Fetching projects with offline-first approach...');
      
      // Use sync engine for offline-first data fetching
      const projects = await syncEngine.getData('projects');
      const tasks = await syncEngine.getData('tasks');
      
      // Transform and combine data
      return projects.map(project => {
        const projectTasks = tasks.filter((task: any) => task.project_id === project.id);
        return this.mapProjectFromDB({ ...project, tasks: projectTasks });
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw new Error('Failed to fetch projects');
    }
  }

  async getProject(id: string): Promise<Project | null> {
    try {
      console.log(`Fetching project ${id} with offline-first approach...`);
      
      const projects = await syncEngine.getData('projects');
      const tasks = await syncEngine.getData('tasks');
      const members = await syncEngine.getData('project_members');
      
      const project = projects.find((p: any) => p.id === id);
      if (!project) return null;
      
      const projectTasks = tasks.filter((t: any) => t.project_id === id);
      const projectMembers = members.filter((m: any) => m.project_id === id);
      
      return this.mapProjectFromDB({ 
        ...project, 
        tasks: projectTasks,
        project_members: projectMembers 
      });
    } catch (error) {
      console.error(`Error fetching project ${id}:`, error);
      throw new Error('Failed to fetch project');
    }
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'tasks' | 'collaborators'>): Promise<Project> {
    try {
      console.log('Creating project with offline-first approach:', project.title);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const projectData = {
        title: project.title,
        description: project.description,
        cover_image: project.coverImage,
        deadline: project.deadline ? new Date(project.deadline).toISOString() : null,
        owner_id: user.id,
        visibility: project.visibility || 'private'
      };

      // Use sync engine for offline-first creation
      const createdProject = await syncEngine.createData('projects', projectData);
      
      // Create project owner membership
      await syncEngine.createData('project_members', {
        project_id: createdProject.id,
        user_id: user.id,
        role: 'owner',
        permission: 'edit',
        invited_by: user.id
      });

      return this.mapProjectFromDB({ ...createdProject, tasks: [], project_members: [] });
    } catch (error) {
      console.error('Error creating project:', error);
      throw new Error('Failed to create project');
    }
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    try {
      console.log(`Updating project ${id} with offline-first approach...`);

      const updateData: any = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.coverImage !== undefined) updateData.cover_image = updates.coverImage;
      if (updates.deadline !== undefined) {
        updateData.deadline = updates.deadline ? new Date(updates.deadline).toISOString() : null;
      }
      if (updates.visibility !== undefined) updateData.visibility = updates.visibility;

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const updatedProject = await syncEngine.updateData('projects', id, updateData);
      
      // Get related data
      const tasks = await syncEngine.getData('tasks');
      const members = await syncEngine.getData('project_members');
      
      const projectTasks = tasks.filter((t: any) => t.project_id === id);
      const projectMembers = members.filter((m: any) => m.project_id === id);
      
      return this.mapProjectFromDB({ 
        ...updatedProject, 
        tasks: projectTasks,
        project_members: projectMembers 
      });
    } catch (error) {
      console.error(`Error updating project ${id}:`, error);
      throw new Error('Failed to update project');
    }
  }

  async deleteProject(id: string): Promise<void> {
    try {
      console.log(`Deleting project ${id} with offline-first approach...`);
      
      await syncEngine.deleteData('projects', id);
    } catch (error) {
      console.error(`Error deleting project ${id}:`, error);
      throw new Error('Failed to delete project');
    }
  }

  async createTask(projectId: string, task: Omit<Task, 'id' | 'projectId'>): Promise<Task> {
    try {
      console.log(`Creating task for project ${projectId} with offline-first approach:`, task.title);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const taskData = {
        title: task.title,
        status: task.status || 'todo',
        due_date: task.dueDate ? new Date(task.dueDate).toISOString() : null,
        notes: task.notes,
        project_id: projectId,
        assigned_to: null,
        created_by: user.id,
      };

      const createdTask = await syncEngine.createData('tasks', taskData);
      return this.mapTaskFromDB(createdTask);
    } catch (error) {
      console.error(`Error creating task for project ${projectId}:`, error);
      throw new Error('Failed to create task');
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    try {
      console.log(`Updating task ${taskId} with offline-first approach...`);

      const updateData: any = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.dueDate !== undefined) {
        updateData.due_date = updates.dueDate ? new Date(updates.dueDate).toISOString() : null;
      }
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const updatedTask = await syncEngine.updateData('tasks', taskId, updateData);
      return this.mapTaskFromDB(updatedTask);
    } catch (error) {
      console.error(`Error updating task ${taskId}:`, error);
      throw new Error('Failed to update task');
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      console.log(`Deleting task ${taskId} with offline-first approach...`);
      
      await syncEngine.deleteData('tasks', taskId);
    } catch (error) {
      console.error(`Error deleting task ${taskId}:`, error);
      throw new Error('Failed to delete task');
    }
  }

  async assignTask(taskId: string, userId: string | null): Promise<Task> {
    try {
      const updatedTask = await syncEngine.updateData('tasks', taskId, { assigned_to: userId });
      return this.mapTaskFromDB(updatedTask);
    } catch (error) {
      console.error(`Error assigning task ${taskId}:`, error);
      throw new Error('Failed to assign task');
    }
  }

  async getProjectMembers(projectId: string): Promise<ProjectCollaborator[]> {
    try {
      const members = await syncEngine.getData('project_members');
      const profiles = await syncEngine.getData('profiles');
      
      const projectMembers = members.filter((m: any) => m.project_id === projectId);
      
      return projectMembers.map((member: any) => {
        const profile = profiles.find((p: any) => p.id === member.user_id);
        return this.mapProjectMemberFromDB({ ...member, profiles: profile });
      });
    } catch (error) {
      console.error(`Error fetching project members for ${projectId}:`, error);
      throw new Error('Failed to fetch project members');
    }
  }

  async addProjectMember(projectId: string, userEmail: string, permission: 'view' | 'edit'): Promise<ProjectCollaborator> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Validate input
      if (!userEmail.trim()) throw new Error('Email is required');
      if (userEmail.length > 100) throw new Error('Email is too long');
      const sanitizedEmail = userEmail.trim();

      // First, find the user by email
      const profiles = await syncEngine.getData('profiles');
      const profile = profiles.find((p: any) => p.handle === sanitizedEmail);
      
      if (!profile) throw new Error('User not found');

      const memberData = {
        project_id: projectId,
        user_id: profile.id,
        permission,
        invited_by: user.id,
      };

      const createdMember = await syncEngine.createData('project_members', memberData);
      return this.mapProjectMemberFromDB({ ...createdMember, profiles: profile });
    } catch (error) {
      console.error(`Error adding member to project ${projectId}:`, error);
      throw new Error('Failed to add project member');
    }
  }

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    try {
      const members = await syncEngine.getData('project_members');
      const member = members.find((m: any) => m.project_id === projectId && m.user_id === userId);
      
      if (member) {
        await syncEngine.deleteData('project_members', member.id);
      }
    } catch (error) {
      console.error(`Error removing member from project ${projectId}:`, error);
      throw new Error('Failed to remove project member');
    }
  }

  async updateProjectMemberPermission(projectId: string, userId: string, permission: 'view' | 'edit'): Promise<ProjectCollaborator> {
    try {
      const members = await syncEngine.getData('project_members');
      const member = members.find((m: any) => m.project_id === projectId && m.user_id === userId);
      
      if (!member) throw new Error('Member not found');
      
      const updatedMember = await syncEngine.updateData('project_members', member.id, { permission });
      
      const profiles = await syncEngine.getData('profiles');
      const profile = profiles.find((p: any) => p.id === userId);
      
      return this.mapProjectMemberFromDB({ ...updatedMember, profiles: profile });
    } catch (error) {
      console.error(`Error updating member permission for project ${projectId}:`, error);
      throw new Error('Failed to update member permission');
    }
  }

  async searchUsersByEmail(query: string): Promise<User[]> {
    try {
      const profiles = await syncEngine.getData('profiles');
      const filteredProfiles = profiles.filter((p: any) => 
        p.handle.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10);
      
      return filteredProfiles.map(this.mapUserFromDB);
    } catch (error) {
      console.error('Error searching users:', error);
      throw new Error('Failed to search users');
    }
  }

  // Sync projects from remote
  async syncProjects(): Promise<void> {
    try {
      await syncEngine.syncFromRemote('projects');
      await syncEngine.syncFromRemote('tasks');
      await syncEngine.syncFromRemote('project_members');
      await syncEngine.syncFromRemote('profiles');
    } catch (error) {
      console.error('Error syncing projects:', error);
      throw new Error('Failed to sync projects');
    }
  }

  private mapProjectFromDB(data: any): Project {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      coverImage: data.cover_image,
      deadline: data.deadline ? new Date(data.deadline).getTime() : undefined,
      tasks: (data.tasks || []).map(this.mapTaskFromDB),
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
      userId: data.owner_id,
      visibility: data.visibility,
      collaborators: (data.project_members || []).map(this.mapProjectMemberFromDB),
    };
  }

  private mapTaskFromDB(data: any): Task {
    return {
      id: data.id,
      title: data.title,
      status: data.status,
      dueDate: data.due_date ? new Date(data.due_date).getTime() : undefined,
      notes: data.notes,
      projectId: data.project_id,
    };
  }

  private mapProjectMemberFromDB(data: any): ProjectCollaborator & { user?: User; permission?: 'view' | 'edit' } {
    return {
      id: data.id,
      projectId: data.project_id,
      userId: data.user_id,
      role: data.role as 'owner' | 'editor' | 'viewer',
      invitedAt: new Date(data.joined_at || data.created_at).getTime(),
      acceptedAt: new Date(data.joined_at || data.created_at).getTime(),
      user: data.profiles ? this.mapUserFromDB(data.profiles) : undefined,
      permission: data.permission as 'view' | 'edit',
    };
  }

  private mapUserFromDB(data: any): User {
    return {
      id: data.id,
      handle: data.handle,
      email: data.handle, // Assuming handle is email
      displayName: data.display_name,
      avatar: data.avatar_url,
      bio: data.bio,
      isVerified: data.is_verified,
      followerCount: data.follower_count,
      followingCount: data.following_count,
      createdAt: new Date(data.created_at).getTime(),
    };
  }
}

export const projectRepository = ProjectRepository.getInstance();