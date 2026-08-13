import * as admin from 'firebase-admin';
import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore';

const REGION = 'europe-west1';

type TaskStatus = 'todo' | 'in-progress' | 'done';

type ProjectActivityRecord = {
  type: 'project_created' | 'task_created' | 'task_status_changed' | 'note_added';
  relatedEntityId: string;
  relatedEntityType: 'project' | 'task' | 'note';
  entityTitle: string;
  fromStatus?: TaskStatus;
  toStatus?: TaskStatus;
};

function activityRef(projectId: string, eventId: string) {
  return admin.firestore()
    .collection('projects')
    .doc(projectId)
    .collection('activities')
    .doc(eventId);
}

async function writeActivity(
  projectId: string,
  eventId: string,
  activity: ProjectActivityRecord
): Promise<void> {
  await activityRef(projectId, eventId).set({
    ...activity,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function removeRelatedActivities(projectId: string, relatedEntityId: string): Promise<void> {
  const activities = await admin.firestore()
    .collection('projects')
    .doc(projectId)
    .collection('activities')
    .where('relatedEntityId', '==', relatedEntityId)
    .get();
  if (activities.empty) return;

  const batches: admin.firestore.WriteBatch[] = [];
  let batch = admin.firestore().batch();
  let count = 0;
  activities.docs.forEach((activity) => {
    if (count === 400) {
      batches.push(batch);
      batch = admin.firestore().batch();
      count = 0;
    }
    batch.delete(activity.ref);
    count += 1;
  });
  if (count > 0) batches.push(batch);
  await Promise.all(batches.map((pendingBatch) => pendingBatch.commit()));
}

function linkedProjectIds(data: admin.firestore.DocumentData): string[] {
  const links = Array.isArray(data.links) ? data.links : [];
  return [...new Set(
    links
      .filter((link) => link?.type === 'project' && typeof link.id === 'string')
      .map((link) => String(link.id))
  )];
}

async function canLinkNoteToProject(projectId: string, noteOwnerId: string): Promise<boolean> {
  const project = await admin.firestore().collection('projects').doc(projectId).get();
  if (!project.exists) return false;
  const data = project.data() ?? {};
  const sharedWith = Array.isArray(data.sharedWith) ? data.sharedWith : [];
  const editors = Array.isArray(data.editors) ? data.editors : [];
  return data.ownerId === noteOwnerId || sharedWith.includes(noteOwnerId) || editors.includes(noteOwnerId);
}

export const onProjectCreatedActivity = onDocumentCreated(
  { document: 'projects/{projectId}', region: REGION },
  async (event) => {
    const project = event.data?.data();
    if (!project) return;
    await writeActivity(event.params.projectId, `project-created-${event.id}`, {
      type: 'project_created',
      relatedEntityId: event.params.projectId,
      relatedEntityType: 'project',
      entityTitle: String(project.title ?? ''),
    });
  }
);

export const onProjectTaskCreatedActivity = onDocumentCreated(
  { document: 'projects/{projectId}/tasks/{taskId}', region: REGION },
  async (event) => {
    const task = event.data?.data();
    if (!task) return;
    await writeActivity(event.params.projectId, `task-created-${event.id}`, {
      type: 'task_created',
      relatedEntityId: event.params.taskId,
      relatedEntityType: 'task',
      entityTitle: String(task.title ?? ''),
    });
  }
);

export const onProjectTaskStatusActivity = onDocumentUpdated(
  { document: 'projects/{projectId}/tasks/{taskId}', region: REGION },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after || before.status === after.status) return;
    await writeActivity(event.params.projectId, `task-status-${event.id}`, {
      type: 'task_status_changed',
      relatedEntityId: event.params.taskId,
      relatedEntityType: 'task',
      entityTitle: String(after.title ?? before.title ?? ''),
      fromStatus: before.status as TaskStatus,
      toStatus: after.status as TaskStatus,
    });
  }
);

export const onProjectTaskDeletedActivity = onDocumentDeleted(
  { document: 'projects/{projectId}/tasks/{taskId}', region: REGION },
  async (event) => {
    await removeRelatedActivities(event.params.projectId, event.params.taskId);
  }
);

export const onLinkedNoteCreatedActivity = onDocumentCreated(
  { document: 'notes/{noteId}', region: REGION },
  async (event) => {
    const note = event.data?.data();
    if (!note) return;
    const ownerId = String(note.ownerId ?? '');
    await Promise.all(linkedProjectIds(note).map(async (projectId) => {
      if (!(await canLinkNoteToProject(projectId, ownerId))) return;
      await writeActivity(projectId, `note-added-${event.id}`, {
        type: 'note_added',
        relatedEntityId: event.params.noteId,
        relatedEntityType: 'note',
        entityTitle: String(note.title ?? ''),
      });
    }));
  }
);

export const onLinkedNoteDeletedActivity = onDocumentDeleted(
  { document: 'notes/{noteId}', region: REGION },
  async (event) => {
    const note = event.data?.data();
    if (!note) return;
    await Promise.all(
      linkedProjectIds(note).map((projectId) => removeRelatedActivities(projectId, event.params.noteId))
    );
  }
);
