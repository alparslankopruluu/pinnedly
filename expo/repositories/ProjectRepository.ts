import { Project, Task, User, ProjectCollaborator, ProjectActivity } from '@/types';
import {
  COLLECTIONS,
  collection,
  type DocumentData,
  doc,
  getCurrentUserId,
  getDb,
  getDoc,
  getDocs,
  limit,
  onQuerySnapshot,
  orderBy,
  query as firestoreQuery,
  requireUserId,
  serverTimestamp,
  timestampToMillis,
  updateDoc,
  where,
} from '@/lib/firestore';
import { DEFAULT_CONTENT_CATEGORY, normalizeCategory } from '@/constants/contentCategories';
import { trackEntityEvent } from '@/lib/analytics';
import { shareApi } from '@/services/shareApi';
import { contentAccessApi } from '@/services/contentAccessApi';

export class ProjectRepository {
  private static instance: ProjectRepository;

  static getInstance(): ProjectRepository {
    if (!ProjectRepository.instance) ProjectRepository.instance = new ProjectRepository();
    return ProjectRepository.instance;
  }

  async getProjects(): Promise<Project[]> {
    const uid = requireUserId();
    const [ownedSnapshot, sharedSnapshot] = await Promise.all([
      getDocs(firestoreQuery(collection(getDb(), COLLECTIONS.projects), where('ownerId', '==', uid))),
      getDocs(
        firestoreQuery(
          collection(getDb(), COLLECTIONS.projects),
          where('sharedWith', 'array-contains', uid)
        )
      ),
    ]);
    const projects = new Map<string, Project>();
    [...ownedSnapshot.docs, ...sharedSnapshot.docs].forEach((snapshotDoc) => {
      projects.set(snapshotDoc.id, this.mapProjectSummary(snapshotDoc.id, snapshotDoc.data()));
    });
    return [...projects.values()];
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

    const ownedProjectsQuery = firestoreQuery(
      collection(getDb(), COLLECTIONS.projects),
      where('ownerId', '==', ownerId)
    );
    const sharedProjectsQuery = firestoreQuery(
      collection(getDb(), COLLECTIONS.projects),
      where('sharedWith', 'array-contains', ownerId)
    );
    let ownedProjects: Project[] = [];
    let sharedProjects: Project[] = [];

    const publish = () => {
      const merged = new Map<string, Project>();
      [...ownedProjects, ...sharedProjects].forEach((project) => merged.set(project.id, project));
      onProjects([...merged.values()]);
    };
    const mapSnapshot = (snapshot: { docs: Array<{ id: string; data: () => DocumentData }> }) =>
      snapshot.docs.map((snapshotDoc) => this.mapProjectSummary(snapshotDoc.id, snapshotDoc.data()));
    const handleError = (error: Error) => {
      console.error('Project subscription error:', error);
      onError?.(error);
    };

    const unsubscribeOwned = onQuerySnapshot(
      ownedProjectsQuery,
      (snapshot) => {
        ownedProjects = mapSnapshot(snapshot);
        publish();
      },
      handleError
    );
    const unsubscribeShared = onQuerySnapshot(
      sharedProjectsQuery,
      (snapshot) => {
        sharedProjects = mapSnapshot(snapshot);
        publish();
      },
      handleError
    );

    return () => {
      unsubscribeOwned();
      unsubscribeShared();
    };
  }

  subscribeToProjectActivities(
    projectId: string,
    onActivities: (activities: ProjectActivity[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const activitiesQuery = firestoreQuery(
      collection(doc(getDb(), COLLECTIONS.projects, projectId), 'activities'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onQuerySnapshot(
      activitiesQuery,
      (snapshot) => {
        onActivities(snapshot.docs.map((activityDoc) => {
          const data = activityDoc.data();
          return {
            id: activityDoc.id,
            projectId,
            type: data.type,
            relatedEntityId: data.relatedEntityId,
            relatedEntityType: data.relatedEntityType,
            entityTitle: data.entityTitle ?? '',
            fromStatus: data.fromStatus,
            toStatus: data.toStatus,
            timestamp: timestampToMillis(data.createdAt),
            source: 'server',
          } as ProjectActivity;
        }));
      },
      (error) => onError?.(error)
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
    requireUserId();
    const ref = doc(collection(getDb(), COLLECTIONS.projects)) as { id: string };
    await contentAccessApi.create('projects', ref.id, {
      title: project.title,
      description: project.description ?? null,
      coverImage: project.coverImage ?? null,
      gallery: project.gallery ?? [],
      deadline: project.deadline ? new Date(project.deadline) : null,
      visibility: project.visibility || 'private',
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
    await contentAccessApi.delete('projects', id);
    await trackEntityEvent('project', 'deleted', id);
  }

  async createTask(projectId: string, task: Omit<Task, 'id' | 'projectId'>): Promise<Task> {
    requireUserId();
    const ref = doc(collection(doc(getDb(), COLLECTIONS.projects, projectId), 'tasks')) as { id: string };
    await contentAccessApi.createProjectTask(projectId, ref.id, {
      title: task.title,
      status: task.status || 'todo',
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      notes: task.notes ?? null,
      category: task.category ?? DEFAULT_CONTENT_CATEGORY,
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
    const { projectId } = await this.findTaskRef(taskId);
    await contentAccessApi.deleteProjectTask(projectId, taskId);
  }

  async assignTask(taskId: string, userId: string | null): Promise<Task> {
    const { projectId, ref } = await this.findTaskRef(taskId);
    await updateDoc(ref, { assignedTo: userId, updatedAt: serverTimestamp() });
    const updated = await getDoc(ref);
    return this.mapTask(updated.id, projectId, updated.data()!);
  }

  // These write task-level visibility fields directly from the client: the Firestore
  // rule for tasks (unlike notes/bookmarks/projects) has no accessFieldsAreUnchanged()
  // restriction, so any project owner/editor can already update them via canEditProject.
  async setTaskVisibility(taskId: string, visibility: 'shared' | 'private'): Promise<Task> {
    const { projectId, ref } = await this.findTaskRef(taskId);
    await updateDoc(ref, { visibility, updatedAt: serverTimestamp() });
    const updated = await getDoc(ref);
    return this.mapTask(updated.id, projectId, updated.data()!);
  }

  async grantTaskVisibility(taskId: string, userId: string): Promise<Task> {
    const { projectId, ref } = await this.findTaskRef(taskId);
    const current = await getDoc(ref);
    const sharedWith = new Set((current.data()?.sharedWith as string[]) ?? []);
    sharedWith.add(userId);
    await updateDoc(ref, { sharedWith: [...sharedWith], updatedAt: serverTimestamp() });
    const updated = await getDoc(ref);
    return this.mapTask(updated.id, projectId, updated.data()!);
  }

  async revokeTaskVisibility(taskId: string, userId: string): Promise<Task> {
    const { projectId, ref } = await this.findTaskRef(taskId);
    const current = await getDoc(ref);
    const sharedWith = ((current.data()?.sharedWith as string[]) ?? []).filter((id) => id !== userId);
    await updateDoc(ref, { sharedWith, updatedAt: serverTimestamp() });
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

    const projectDoc = await getDoc(doc(getDb(), COLLECTIONS.projects, projectId));
    if (!projectDoc.exists()) return members;
    const projectData = projectDoc.data();
    return this.withOwnerMember(projectId, projectData.ownerId, projectData.createdAt, members);
  }

  private async withOwnerMember(
    projectId: string,
    ownerId: string,
    ownerSince: unknown,
    members: ProjectCollaborator[]
  ): Promise<ProjectCollaborator[]> {
    if (!ownerId || members.some((member) => member.userId === ownerId)) return members;

    let profile: DocumentData | undefined;
    try {
      const userDoc = await getDoc(doc(getDb(), COLLECTIONS.users, ownerId));
      profile = userDoc.exists() ? userDoc.data() : undefined;
    } catch (error) {
      console.warn(`Failed to load owner profile for project ${projectId}:`, error);
    }

    const ownerMember = this.mapMember(
      `owner:${ownerId}`,
      { projectId, userId: ownerId, role: 'owner', permission: 'edit', joinedAt: ownerSince },
      profile
    );
    return [ownerMember, ...members];
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

  // Firestore security rules aren't query filters: once a rule depends on
  // per-document fields (visibility/sharedWith/assignedTo) for non-owners, an
  // unconstrained collection read is rejected outright for them. The project
  // owner's disjunct is doc-independent, so only they can safely fetch
  // unconstrained; everyone else needs the union of rule-provable queries.
  private async fetchVisibleTasks(projectId: string, ownerId: string): Promise<Task[]> {
    const tasksRef = collection(doc(getDb(), COLLECTIONS.projects, projectId), 'tasks');
    const uid = getCurrentUserId();

    if (uid && uid === ownerId) {
      const snap = await getDocs(tasksRef);
      return snap.docs.map((taskDoc) => this.mapTask(taskDoc.id, projectId, taskDoc.data()));
    }

    const queries = [firestoreQuery(tasksRef, where('visibility', '==', 'shared'))];
    if (uid) {
      queries.push(firestoreQuery(tasksRef, where('sharedWith', 'array-contains', uid)));
      queries.push(firestoreQuery(tasksRef, where('assignedTo', '==', uid)));
    }

    const snapshots = await Promise.all(queries.map((taskQuery) => getDocs(taskQuery)));
    const tasks = new Map<string, Task>();
    snapshots.forEach((snap) => {
      snap.docs.forEach((taskDoc) => tasks.set(taskDoc.id, this.mapTask(taskDoc.id, projectId, taskDoc.data())));
    });
    return [...tasks.values()];
  }

  private async mapProjectDoc(id: string, data: DocumentData): Promise<Project> {
    let tasks: Task[] = [];
    try {
      tasks = await this.fetchVisibleTasks(id, data.ownerId);
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

    const collaborators = await this.withOwnerMember(id, data.ownerId, data.createdAt, members);

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
      collaborators,
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
      createdAt: data.createdAt ? timestampToMillis(data.createdAt) : undefined,
      updatedAt: data.updatedAt ? timestampToMillis(data.updatedAt) : undefined,
      assignedTo: (data.assignedTo as string | null | undefined) ?? null,
      visibility: (data.visibility as Task['visibility']) || 'shared',
      sharedWith: (data.sharedWith as string[]) ?? [],
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
