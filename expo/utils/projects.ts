import { Project } from '@/types';

export function dedupeProjectsById(projects: Project[]): Project[] {
  const seenIds = new Set<string>();
  return projects.filter((project) => {
    if (seenIds.has(project.id)) return false;
    seenIds.add(project.id);
    return true;
  });
}