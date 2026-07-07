import { Project, Task, User, ProjectCollaborator } from '@/types';
import {
  COLLECTIONS,
  collection,
  deleteDoc,
  type DocumentData,
  doc,
  getDb,
  getDoc,
  getDocs,
  limit,
  onQuerySnapshot,
  query as firestoreQuery,
  requireUserId,
  serverTimestamp,
  setDoc,
  timestampToMillis,
  updateDoc,
  where,
  writeBatch,
} from '@/lib/firestore';
import { DEFAULT_CONTENT_CATEGORY, normalizeCategory } from '@/constants/contentCategories';
import { trackEntityEvent } from '@/lib/analytics';
import { shareApi } from '@/services/shareApi';

export class ProjectRepository {
  private static instance: ProjectRepository;

  static getInstance(): ProjectRepository {
    if (!ProjectRepository.instance) ProjectRepository.instance = new ProjectRepository();
    return ProjectRepository.instance;
  }

  async getProjects(): Promise<Project[]> {
    const uid = requireUserId();
    const snapshot = await getDocs(
      firestoreQuery(collection(getDb(), COLLECTIONS.projects), where('ownerId', '==', uid))
    );
    return snapshot.docs.map((snapshotDoc) => this.mapProjectSummary(snapshotDoc.id, snapshotDoc.data()));
  }

  subscribeToProjects(
    ownerId: string | null,
    onProjects: (projects: Project[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!ownerId) {
      onProjects([]);
      return () => undefined;
    }

    const projectsQuery = firestoreQuery(
      collection(getDb(), COLLECTIONS.projects),
      where('ownerId', '==', ownerId)
    );

    return onQuerySnapshot(
      projectsQuery,
      (snapshot) => {
        try {
          const projects = snapshot.docs.map((snapshotDoc) =>
            this.mapProjectSummary(snapshotDoc.id, snapshotDoc.data())
          );
          onProjects(projects);
        } catch (error) {
          console.error('Project subscription mapping error:', error);
          onError?.(error instanceof Error ? error : new Error('Failed to map projects'));
        }
      },
      (error) => {
        console.error('Project subscription error:', error);
        onError?.(error);
      }
    );
  }

  async getProject(id: string): Promise<Project | null> {
    const projectDoc = await getDoc(doc(getDb(), COLLECTIONS.projects, id));
    if (!projectDoc.exists()) return null;
    return this.mapProjectDoc(projectDoc.id, projectDoc.data());
  }

  async createProject(
    project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'tasks' | 'collaborators'>
  ): Promise<Project> {
    const uid = requireUserId();
    const ref = doc(collection(getDb(), COLLECTIONS.projects));
    await setDoc(ref, {
      ownerId: uid,
      title: project.title,
      description: project.description ?? null,
      coverImage: project.coverImage ?? null,
      gallery: project.gallery ?? [],
      deadline: project.deadline ? new Date(project.deadline) : null,
      visibility: project.visibility || 'private',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const created = await getDoc(ref);
    const mapped = await this.mapProjectDoc(created.id, created.data()!);
    await trackEntityEvent('project', 'created', mapped.id);
    return mapped;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    requireUserId();
    const ref = doc(getDb(), COLLECTIONS.projects, id);
    await updateDoc(ref, {
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.coverImage !== undefined && { coverImage: updates.coverImage }),
      ...(updates.gallery !== undefined && { gallery: updates.gallery }),
      ...(updates.deadline !== undefined && { deadline: updates.deadline ? new Date(updates.deadline) : null }),
      ...(updates.visibility !== undefined && { visibility: updates.visibility }),
      updatedAt: serverTimestamp(),
    });
    const updated = await getDoc(ref);
    const mapped = await this.mapProjectDoc(updated.id, updated.data()!);
    await trackEntityEvent('project', 'updated', mapped.id);
    return mapped;
  }

  async deleteProject(id: string): Promise<void> {
    requireUserId();
    const projectRef = doc(getDb(), COLLECTIONS.projects, id);
    const tasks = await getDocs(collection(projectRef, 'tasks'));
    const batch = writeBatch(getDb());
    tasks.docs.forEach((taskDoc) => batch.delete(taskDoc.ref));
    batch.delete(projectRef);
    await batch.commit();
    await trackEntityEvent('project', 'deleted', id);
  }

  async createTask(projectId: string, task: Omit<Task, 'id' | 'projectId'>): Promise<Task> {
    requireUserId();
    const ref = doc(collection(doc(getDb(), COLLECTIONS.projects, projectId), 'tasks'));
    await setDoc(ref, {
      title: task.title,
      status: task.status || 'todo',
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      notes: task.notes ?? null,
      category: task.category ?? DEFAULT_CONTENT_CATEGORY,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const created = await getDoc(ref);
    return this.mapTask(created.id, projectId, created.data()!);
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    requireUserId();
    const { projectId, ref } = await this.findTaskRef(taskId);
    await updateDoc(ref, {
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.dueDate !== undefined && { dueDate: updates.dueDate ? new Date(updates.dueDate) : null }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      ...(updates.category !== undefined && { category: updates.category }),
      updatedAt: serverTimestamp(),
    });
    const updated = await getDoc(ref);
    return this.mapTask(updated.id, projectId, updated.data()!);
  }

  async deleteTask(taskId: string): Promise<void> {
    requireUserId();
    const { ref } = await this.findTaskRef(taskId);
    await deleteDoc(ref);
  }

  async assignTask(taskId: string, userId: string | null): Promise<Task> {
    const { projectId, ref } = await this.findTaskRef(taskId);
    await updateDoc(ref, { assignedTo: userId, updatedAt: serverTimestamp() });
    const updated = await getDoc(ref);
    return this.mapTask(updated.id, projectId, updated.data()!);
  }

  async getProjectMembers(projectId: string): Promise<ProjectCollaborator[]> {
    const snapshot = await getDocs(
      firestoreQuery(
        collection(getDb(), COLLECTIONS.projectMembers),
        where('projectId', '==', projectId)
      )
    );

    const members: ProjectCollaborator[] = [];
    for (const memberDoc of snapshot.docs) {
      const data = memberDoc.data();
      const userDoc = await getDoc(doc(getDb(), COLLECTIONS.users, data.userId));
      members.push(this.mapMember(memberDoc.id, data, userDoc.exists() ? userDoc.data() : undefined));
    }
    return members;
  }

  async addProjectMember(projectId: string, userEmail: string, permission: 'view' | 'edit'): Promise<ProjectCollaborator> {
    const share = await shareApi.shareEntityWithHandle({
      entityId: projectId,
      entityType: 'project',
      userEmail: userEmail.trim(),
      permission,
    });

    return {
      id: share.id,
      projectId,
      userId: share.userId,
      role: share.permission === 'edit' ? 'editor' : 'viewer',
      invitedAt: share.createdAt,
      acceptedAt: share.createdAt,
      permission: share.permission,
      user: share.user,
    } as ProjectCollaborator & { user?: User; permission?: 'view' | 'edit' };
  }

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    await shareApi.removeProjectMember({ projectId, userId });
  }

  async updateProjectMemberPermission(
    projectId: string,
    userId: string,
    permission: 'view' | 'edit'
  ): Promise<ProjectCollaborator> {
    const share = await shareApi.updateProjectMemberPermission({ projectId, userId, permission });
    return {
      id: share.id,
      projectId,
      userId: share.userId,
      role: share.permission === 'edit' ? 'editor' : 'viewer',
      invitedAt: share.createdAt,
      acceptedAt: share.createdAt,
      permission: share.permission,
      user: share.user,
    } as ProjectCollaborator & { user?: User; permission?: 'view' | 'edit' };
  }

  async searchUsersByEmail(query: string): Promise<User[]> {
    const snapshot = await getDocs(
      firestoreQuery(
        collection(getDb(), COLLECTIONS.users),
        where('handle', '>=', query.toLowerCase()),
        where('handle', '<=', query.toLowerCase() + '\uf8ff'),
        limit(10)
      )
    );
    return snapshot.docs.map((snapshotDoc) => ({
      id: snapshotDoc.id,
      handle: snapshotDoc.data().handle,
      email: snapshotDoc.data().email || '',
      displayName: snapshotDoc.data().displayName,
      avatar: snapshotDoc.data().avatar,
      bio: snapshotDoc.data().bio,
      isVerified: snapshotDoc.data().isVerified,
      followerCount: snapshotDoc.data().followerCount ?? 0,
      followingCount: snapshotDoc.data().followingCount ?? 0,
      createdAt: timestampToMillis(snapshotDoc.data().createdAt),
    }));
  }

  async syncProjects(): Promise<void> {
    // Firestore offline persistence handles sync
  }

  private async findTaskRef(taskId: string) {
    const uid = requireUserId();
    const ownedProjects = await getDocs(
      firestoreQuery(collection(getDb(), COLLECTIONS.projects), where('ownerId', '==', uid))
    );
    const sharedProjects = await getDocs(
      firestoreQuery(collection(getDb(), COLLECTIONS.projects), where('sharedWith', 'array-contains', uid))
    );
    const projects = [...ownedProjects.docs, ...sharedProjects.docs];
    const seenProjectIds = new Set<string>();

    for (const projectDoc of projects) {
      if (seenProjectIds.has(projectDoc.id)) continue;
      seenProjectIds.add(projectDoc.id);
      const taskRef = doc(collection(projectDoc.ref, 'tasks'), taskId);
      const task = await getDoc(taskRef);
      if (task.exists()) {
        return { projectId: projectDoc.id, ref: taskRef };
      }
    }
    throw new Error('Task not found');
  }

  private mapProjectSummary(id: string, data: DocumentData): Project {
    return {
      id,
      title: data.title,
      description: data.description,
      coverImage: data.coverImage,
      gallery: (data.gallery as string[]) ?? [],
      deadline: data.deadline ? timestampToMillis(data.deadline) : undefined,
      tasks: [],
      createdAt: timestampToMillis(data.createdAt),
      updatedAt: timestampToMillis(data.updatedAt),
      userId: data.ownerId,
      visibility: data.visibility,
      collaborators: [],
    };
  }

  private async mapProjectDoc(id: string, data: DocumentData): Promise<Project> {
    let tasks: Task[] = [];
    try {
      const tasksSnap = await getDocs(collection(doc(getDb(), COLLECTIONS.projects, id), 'tasks'));
      tasks = tasksSnap.docs.map((taskDoc) => this.mapTask(taskDoc.id, id, taskDoc.data()));
    } catch (error) {
      console.warn(`Failed to load tasks for project ${id}:`, error);
    }

    const members: ProjectCollaborator[] = [];
    try {
      const membersSnap = await getDocs(
        firestoreQuery(
          collection(getDb(), COLLECTIONS.projectMembers),
          where('projectId', '==', id)
        )
      );
      for (const memberDoc of membersSnap.docs) {
        const memberData = memberDoc.data();
        try {
          const userDoc = await getDoc(doc(getDb(), COLLECTIONS.users, memberData.userId));
          members.push(this.mapMember(memberDoc.id, memberData, userDoc.data()));
        } catch (error) {
          console.warn(`Failed to load member profile for project ${id}:`, error);
          members.push(this.mapMember(memberDoc.id, memberData));
        }
      }
    } catch (error) {
      console.warn(`Failed to load members for project ${id}:`, error);
    }

    return {
      id,
      title: data.title,
      description: data.description,
      coverImage: data.coverImage,
      gallery: (data.gallery as string[]) ?? [],
      deadline: data.deadline ? timestampToMillis(data.deadline) : undefined,
      tasks,
      createdAt: timestampToMillis(data.createdAt),
      updatedAt: timestampToMillis(data.updatedAt),
      userId: data.ownerId,
      visibility: data.visibility,
      collaborators: members,
    };
  }

  private mapTask(id: string, projectId: string, data: DocumentData): Task {
    return {
      id,
      title: data.title,
      status: data.status,
      dueDate: data.dueDate ? timestampToMillis(data.dueDate) : undefined,
      notes: data.notes,
      projectId,
      category: normalizeCategory(data.category as string | undefined),
    };
  }

  private mapMember(
    id: string,
    data: DocumentData,
    profile?: DocumentData
  ): ProjectCollaborator & { user?: User; permission?: 'view' | 'edit' } {
    return {
      id,
      projectId: data.projectId,
      userId: data.userId,
      role: data.role,
      invitedAt: timestampToMillis(data.joinedAt ?? data.createdAt),
      acceptedAt: timestampToMillis(data.joinedAt ?? data.createdAt),
      permission: data.permission,
      user: profile
        ? {
            id: data.userId,
            handle: profile.handle,
            email: profile.email || '',
            displayName: profile.displayName,
            avatar: profile.avatar,
            bio: profile.bio,
            isVerified: profile.isVerified,
            followerCount: profile.followerCount ?? 0,
            followingCount: profile.followingCount ?? 0,
            createdAt: timestampToMillis(profile.createdAt),
          }
        : undefined,
    };
  }
}

export const projectRepository = ProjectRepository.getInstance();
