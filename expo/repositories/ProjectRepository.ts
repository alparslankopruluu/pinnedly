import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { Project, Task, User, ProjectCollaborator } from '@/types';
import { COLLECTIONS, requireUserId, serverTimestamp, timestampToMillis } from '@/lib/firestore';
import { trackEntityEvent } from '@/lib/analytics';

export class ProjectRepository {
  private static instance: ProjectRepository;

  static getInstance(): ProjectRepository {
    if (!ProjectRepository.instance) ProjectRepository.instance = new ProjectRepository();
    return ProjectRepository.instance;
  }

  async getProjects(): Promise<Project[]> {
    const uid = requireUserId();
    const snapshot = await firestore().collection(COLLECTIONS.projects).where('ownerId', '==', uid).get();
    return snapshot.docs.map((doc) => this.mapProjectSummary(doc.id, doc.data()));
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

    return firestore()
      .collection(COLLECTIONS.projects)
      .where('ownerId', '==', ownerId)
      .onSnapshot(
        (snapshot) => {
          try {
            const projects = snapshot.docs.map((doc) => this.mapProjectSummary(doc.id, doc.data()));
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
    const doc = await firestore().collection(COLLECTIONS.projects).doc(id).get();
    if (!doc.exists()) return null;
    return this.mapProjectDoc(doc.id, doc.data()!);
  }

  async createProject(
    project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'tasks' | 'collaborators'>
  ): Promise<Project> {
    const uid = requireUserId();
    const ref = firestore().collection(COLLECTIONS.projects).doc();
    await ref.set({
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

    await firestore().collection(COLLECTIONS.projectMembers).add({
      projectId: ref.id,
      userId: uid,
      role: 'owner',
      permission: 'edit',
      invitedBy: uid,
      joinedAt: serverTimestamp(),
    });

    const created = await ref.get();
    const mapped = await this.mapProjectDoc(created.id, created.data()!);
    await trackEntityEvent('project', 'created', mapped.id);
    return mapped;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    requireUserId();
    const ref = firestore().collection(COLLECTIONS.projects).doc(id);
    await ref.update({
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.coverImage !== undefined && { coverImage: updates.coverImage }),
      ...(updates.gallery !== undefined && { gallery: updates.gallery }),
      ...(updates.deadline !== undefined && { deadline: updates.deadline ? new Date(updates.deadline) : null }),
      ...(updates.visibility !== undefined && { visibility: updates.visibility }),
      updatedAt: serverTimestamp(),
    });
    const updated = await ref.get();
    const mapped = await this.mapProjectDoc(updated.id, updated.data()!);
    await trackEntityEvent('project', 'updated', mapped.id);
    return mapped;
  }

  async deleteProject(id: string): Promise<void> {
    requireUserId();
    const tasks = await firestore().collection(COLLECTIONS.projects).doc(id).collection('tasks').get();
    const batch = firestore().batch();
    tasks.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(firestore().collection(COLLECTIONS.projects).doc(id));
    await batch.commit();
    await trackEntityEvent('project', 'deleted', id);
  }

  async createTask(projectId: string, task: Omit<Task, 'id' | 'projectId'>): Promise<Task> {
    requireUserId();
    const ref = firestore().collection(COLLECTIONS.projects).doc(projectId).collection('tasks').doc();
    await ref.set({
      title: task.title,
      status: task.status || 'todo',
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      notes: task.notes ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const created = await ref.get();
    return this.mapTask(created.id, projectId, created.data()!);
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    requireUserId();
    const { projectId, ref } = await this.findTaskRef(taskId);
    await ref.update({
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.dueDate !== undefined && { dueDate: updates.dueDate ? new Date(updates.dueDate) : null }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      updatedAt: serverTimestamp(),
    });
    const updated = await ref.get();
    return this.mapTask(updated.id, projectId, updated.data()!);
  }

  async deleteTask(taskId: string): Promise<void> {
    requireUserId();
    const { ref } = await this.findTaskRef(taskId);
    await ref.delete();
  }

  async assignTask(taskId: string, userId: string | null): Promise<Task> {
    const { projectId, ref } = await this.findTaskRef(taskId);
    await ref.update({ assignedTo: userId, updatedAt: serverTimestamp() });
    const updated = await ref.get();
    return this.mapTask(updated.id, projectId, updated.data()!);
  }

  async getProjectMembers(projectId: string): Promise<ProjectCollaborator[]> {
    const snapshot = await firestore()
      .collection(COLLECTIONS.projectMembers)
      .where('projectId', '==', projectId)
      .get();

    const members: ProjectCollaborator[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const userDoc = await firestore().collection(COLLECTIONS.users).doc(data.userId).get();
      members.push(this.mapMember(doc.id, data, userDoc.exists() ? userDoc.data() : undefined));
    }
    return members;
  }

  async addProjectMember(projectId: string, userEmail: string, permission: 'view' | 'edit'): Promise<ProjectCollaborator> {
    const uid = requireUserId();
    const users = await firestore()
      .collection(COLLECTIONS.users)
      .where('handle', '==', userEmail.trim().toLowerCase())
      .limit(1)
      .get();
    if (users.empty) throw new Error('User not found');

    const target = users.docs[0];
    const ref = await firestore().collection(COLLECTIONS.projectMembers).add({
      projectId,
      userId: target.id,
      role: 'member',
      permission,
      invitedBy: uid,
      joinedAt: serverTimestamp(),
    });
    const created = await ref.get();
    return this.mapMember(created.id, created.data()!, target.data());
  }

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    const snapshot = await firestore()
      .collection(COLLECTIONS.projectMembers)
      .where('projectId', '==', projectId)
      .where('userId', '==', userId)
      .get();
    await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
  }

  async updateProjectMemberPermission(
    projectId: string,
    userId: string,
    permission: 'view' | 'edit'
  ): Promise<ProjectCollaborator> {
    const snapshot = await firestore()
      .collection(COLLECTIONS.projectMembers)
      .where('projectId', '==', projectId)
      .where('userId', '==', userId)
      .limit(1)
      .get();
    if (snapshot.empty) throw new Error('Member not found');
    const doc = snapshot.docs[0];
    await doc.ref.update({ permission });
    const userDoc = await firestore().collection(COLLECTIONS.users).doc(userId).get();
    return this.mapMember(doc.id, doc.data(), userDoc.data());
  }

  async searchUsersByEmail(query: string): Promise<User[]> {
    const snapshot = await firestore()
      .collection(COLLECTIONS.users)
      .where('handle', '>=', query.toLowerCase())
      .where('handle', '<=', query.toLowerCase() + '\uf8ff')
      .limit(10)
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      handle: doc.data().handle,
      email: doc.data().email || '',
      displayName: doc.data().displayName,
      avatar: doc.data().avatar,
      bio: doc.data().bio,
      isVerified: doc.data().isVerified,
      followerCount: doc.data().followerCount ?? 0,
      followingCount: doc.data().followingCount ?? 0,
      createdAt: timestampToMillis(doc.data().createdAt),
    }));
  }

  async syncProjects(): Promise<void> {
    // Firestore offline persistence handles sync
  }

  private async findTaskRef(taskId: string) {
    const uid = requireUserId();
    const projects = await firestore().collection(COLLECTIONS.projects).where('ownerId', '==', uid).get();
    for (const project of projects.docs) {
      const taskRef = project.ref.collection('tasks').doc(taskId);
      const task = await taskRef.get();
      if (task.exists()) {
        return { projectId: project.id, ref: taskRef };
      }
    }
    throw new Error('Task not found');
  }

  private mapProjectSummary(id: string, data: FirebaseFirestoreTypes.DocumentData): Project {
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

  private async mapProjectDoc(id: string, data: FirebaseFirestoreTypes.DocumentData): Promise<Project> {
    let tasks: Task[] = [];
    try {
      const tasksSnap = await firestore().collection(COLLECTIONS.projects).doc(id).collection('tasks').get();
      tasks = tasksSnap.docs.map((doc) => this.mapTask(doc.id, id, doc.data()));
    } catch (error) {
      console.warn(`Failed to load tasks for project ${id}:`, error);
    }

    const members: ProjectCollaborator[] = [];
    try {
      const membersSnap = await firestore().collection(COLLECTIONS.projectMembers).where('projectId', '==', id).get();
      for (const memberDoc of membersSnap.docs) {
        const memberData = memberDoc.data();
        try {
          const userDoc = await firestore().collection(COLLECTIONS.users).doc(memberData.userId).get();
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

  private mapTask(id: string, projectId: string, data: FirebaseFirestoreTypes.DocumentData): Task {
    return {
      id,
      title: data.title,
      status: data.status,
      dueDate: data.dueDate ? timestampToMillis(data.dueDate) : undefined,
      notes: data.notes,
      projectId,
    };
  }

  private mapMember(
    id: string,
    data: FirebaseFirestoreTypes.DocumentData,
    profile?: FirebaseFirestoreTypes.DocumentData
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