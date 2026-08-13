import type { Note, Project, ProjectActivity } from '@/types';

function baselineId(type: ProjectActivity['type'], projectId: string, entityId: string): string {
  return `baseline:${type}:${projectId}:${entityId}`;
}

export function buildProjectActivityBaseline(
  project: Project,
  notes: Note[]
): ProjectActivity[] {
  const baseline: ProjectActivity[] = [
    {
      id: baselineId('project_created', project.id, project.id),
      projectId: project.id,
      type: 'project_created',
      relatedEntityId: project.id,
      relatedEntityType: 'project',
      entityTitle: project.title,
      timestamp: project.createdAt,
      source: 'baseline',
    },
  ];

  project.tasks.forEach((task) => {
    if (!task.createdAt) return;
    baseline.push({
      id: baselineId('task_created', project.id, task.id),
      projectId: project.id,
      type: 'task_created',
      relatedEntityId: task.id,
      relatedEntityType: 'task',
      entityTitle: task.title,
      timestamp: task.createdAt,
      source: 'baseline',
    });
  });

  notes.forEach((note) => {
    if (!note.links.some((link) => link.type === 'project' && link.id === project.id)) return;
    baseline.push({
      id: baselineId('note_added', project.id, note.id),
      projectId: project.id,
      type: 'note_added',
      relatedEntityId: note.id,
      relatedEntityType: 'note',
      entityTitle: note.title,
      timestamp: note.createdAt,
      source: 'baseline',
    });
  });

  return baseline;
}

function creationKey(activity: ProjectActivity): string | null {
  if (!['project_created', 'task_created', 'note_added'].includes(activity.type)) return null;
  return `${activity.type}:${activity.relatedEntityType ?? ''}:${activity.relatedEntityId ?? ''}`;
}

export function mergeProjectActivities(
  serverActivities: ProjectActivity[],
  baselineActivities: ProjectActivity[],
  limit = 50
): ProjectActivity[] {
  const serverCreationKeys = new Set(
    serverActivities.map(creationKey).filter((key): key is string => Boolean(key))
  );
  const compatibleBaseline = baselineActivities.filter((activity) => {
    const key = creationKey(activity);
    return !key || !serverCreationKeys.has(key);
  });

  return [...serverActivities, ...compatibleBaseline]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}
