import type { ActivityItem, ID } from '@/types';

export function removeActivitiesByRelatedId(
  activities: ActivityItem[],
  relatedId: ID
): ActivityItem[] {
  return activities.filter((activity) => activity.relatedId !== relatedId);
}
