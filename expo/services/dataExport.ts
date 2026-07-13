import { Platform } from 'react-native';
import { bookmarkRepository } from '@/repositories/BookmarkRepository';
import { noteRepository } from '@/repositories/NoteRepository';
import { todoRepository } from '@/repositories/TodoRepository';
import { projectRepository } from '@/repositories/ProjectRepository';
import { bookmarkListRepository } from '@/repositories/BookmarkListRepository';

export async function exportUserData(): Promise<void> {
  const [bookmarks, notes, todos, projectSummaries, bookmarkLists] = await Promise.all([
    bookmarkRepository.getBookmarks(),
    noteRepository.getNotes(),
    todoRepository.getTodos(),
    projectRepository.getProjects(),
    bookmarkListRepository.getMyLists(),
  ]);
  const projects = await Promise.all(
    projectSummaries.map(async (project) => (await projectRepository.getProject(project.id)) ?? project)
  );
  const payload = JSON.stringify(
    {
      format: 'draft-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      bookmarks,
      notes,
      todos,
      projects,
      bookmarkLists,
    },
    null,
    2
  );
  const filename = `draft-export-${new Date().toISOString().slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const FileSystem = await import('expo-file-system/legacy');
  const Sharing = await import('expo-sharing');
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, payload, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Draft data export',
  });
}
