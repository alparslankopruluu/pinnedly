import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import { Project, Task, User, ProjectCollaborator } from '@/types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];
type TaskRow = Database['public']['Tables']['tasks']['Row'];
type ProjectMemberRow = Database['public']['Tables']['project_members']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export class ProjectRepository {
  async getProjects(): Promise<Project[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        tasks(*),
        project_members(
          *,
          profiles(*)
        )
      `)
      .or(`owner_id.eq.${user.user.id},project_members.user_id.eq.${user.user.id}`);

    if (error) throw error;

    return projects.map(this.mapProjectFromDB);
  }

  async getProject(id: string): Promise<Project | null> {
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        tasks(*),
        project_members(
          *,
          profiles(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapProjectFromDB(project);
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'tasks' | 'collaborators'>): Promise<Project> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('projects')
      .insert({
        title: project.title,
        description: project.description,
        cover_image: project.coverImage,
        deadline: project.deadline ? new Date(project.deadline).toISOString() : null,
        owner_id: user.user.id,
        visibility: project.visibility,
      })
      .select(`
        *,
        tasks(*),
        project_members(
          *,
          profiles(*)
        )
      `)
      .single();

    if (error) throw error;

    return this.mapProjectFromDB(data);
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const updateData: any = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.coverImage !== undefined) updateData.cover_image = updates.coverImage;
    if (updates.deadline !== undefined) {
      updateData.deadline = updates.deadline ? new Date(updates.deadline).toISOString() : null;
    }
    if (updates.visibility !== undefined) updateData.visibility = updates.visibility;

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        tasks(*),
        project_members(
          *,
          profiles(*)
        )
      `)
      .single();

    if (error) throw error;

    return this.mapProjectFromDB(data);
  }

  async deleteProject(id: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async createTask(projectId: string, task: Omit<Task, 'id' | 'projectId'>): Promise<Task> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: task.title,
        status: task.status,
        due_date: task.dueDate ? new Date(task.dueDate).toISOString() : null,
        notes: task.notes,
        project_id: projectId,
        assigned_to: null, // Will be set separately
        created_by: user.user.id,
      })
      .select('*')
      .single();

    if (error) throw error;

    return this.mapTaskFromDB(data);
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const updateData: any = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.dueDate !== undefined) {
      updateData.due_date = updates.dueDate ? new Date(updates.dueDate).toISOString() : null;
    }
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select('*')
      .single();

    if (error) throw error;

    return this.mapTaskFromDB(data);
  }

  async deleteTask(taskId: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  }

  async assignTask(taskId: string, userId: string | null): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update({ assigned_to: userId })
      .eq('id', taskId)
      .select('*')
      .single();

    if (error) throw error;

    return this.mapTaskFromDB(data);
  }

  async getProjectMembers(projectId: string): Promise<ProjectCollaborator[]> {
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        *,
        profiles(*)
      `)
      .eq('project_id', projectId);

    if (error) throw error;

    return data.map(this.mapProjectMemberFromDB);
  }

  async addProjectMember(projectId: string, userEmail: string, permission: 'view' | 'edit'): Promise<ProjectCollaborator> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    // First, find the user by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('handle', userEmail) // Assuming handle is used as email
      .single();

    if (profileError) throw new Error('User not found');

    const { data, error } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: profile.id,
        permission,
        invited_by: user.user.id,
      })
      .select(`
        *,
        profiles(*)
      `)
      .single();

    if (error) throw error;

    return this.mapProjectMemberFromDB(data);
  }

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async updateProjectMemberPermission(projectId: string, userId: string, permission: 'view' | 'edit'): Promise<ProjectCollaborator> {
    const { data, error } = await supabase
      .from('project_members')
      .update({ permission })
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .select(`
        *,
        profiles(*)
      `)
      .single();

    if (error) throw error;

    return this.mapProjectMemberFromDB(data);
  }

  async searchUsersByEmail(query: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('handle', `%${query}%`)
      .limit(10);

    if (error) throw error;

    return data.map(this.mapUserFromDB);
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

  private mapTaskFromDB(data: TaskRow): Task {
    return {
      id: data.id,
      title: data.title,
      status: data.status,
      dueDate: data.due_date ? new Date(data.due_date).getTime() : undefined,
      notes: data.notes,
      projectId: data.project_id,
    };
  }

  private mapProjectMemberFromDB(data: any): ProjectCollaborator {
    return {
      id: data.id,
      projectId: data.project_id,
      userId: data.user_id,
      role: data.role as 'owner' | 'editor' | 'viewer',
      invitedAt: new Date(data.joined_at).getTime(),
      acceptedAt: new Date(data.joined_at).getTime(),
    };
  }

  private mapUserFromDB(data: ProfileRow): User {
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