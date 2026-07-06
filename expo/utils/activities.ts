import { router } from 'expo-router';
import { TFunction } from 'i18next';
import { useAppStore } from '@/store/useAppStore';
import { ActivityItem, Project } from '@/types';

type ActivityInput = Omit<ActivityItem, 'id' | 'timestamp'>;

const ACTIVITY_TITLE_KEYS: Record<ActivityItem['type'], string> = {
  bookmark_added: 'activities.bookmark_added',
  bookmark_opened: 'activities.bookmark_opened',
  project_created: 'activities.project_created',
  task_completed: 'activities.task_completed',
  note_added: 'activities.note_added',
  todo_added: 'activities.todo_added',
  todo_completed: 'activities.todo_completed',
};

export function getActivityTitle(
  activity: { type: string; title: string },
  t: TFunction
): string {
  const key = ACTIVITY_TITLE_KEYS[activity.type as ActivityItem['type']];
  if (!key) return activity.title;
  const translated = t(key);
  return translated === key ? activity.title : translated;
}

export function recordActivity(activity: ActivityInput): void {
  useAppStore.getState().addActivity(activity);
}

export function getActivityRoute(
  activity: ActivityItem,
  projects: Project[] = []
): string | null {
  if (!activity.relatedId) return null;

  switch (activity.type) {
    case 'project_created':
      return `/project/${activity.relatedId}`;
    case 'note_added':
      return `/note/${activity.relatedId}`;
    case 'bookmark_added':
    case 'bookmark_opened':
      return `/bookmark/${activity.relatedId}`;
    case 'task_completed': {
      const project = projects.find((item) =>
        item.tasks.some((task) => task.id === activity.relatedId)
      );
      return project ? `/project/${project.id}` : null;
    }
    case 'todo_added':
    case 'todo_completed':
      return `/add-todo?id=${activity.relatedId}`;
    default:
      return null;
  }
}

export function navigateToActivity(activity: ActivityItem, projects: Project[] = []): void {
  const route = getActivityRoute(activity, projects);
  if (route) {
    router.push(route as never);
  }
}