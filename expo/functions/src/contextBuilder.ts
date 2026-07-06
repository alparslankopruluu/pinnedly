import * as admin from 'firebase-admin';

export type WorkspaceItemType = 'note' | 'bookmark' | 'project' | 'todo';

export interface WorkspaceStats {
  notes: number;
  bookmarks: number;
  projects: number;
  todos: number;
  openTodos: number;
  completedTodos: number;
  inboxBookmarks: number;
  projectTasksDone: number;
  projectTasksTotal: number;
}

export interface RankedItem {
  type: WorkspaceItemType;
  id: string;
  title: string;
  snippet: string;
  status?: string;
  createdAt?: number;
  score: number;
}

export interface WorkspaceContext {
  stats: WorkspaceStats;
  items: RankedItem[];
  isEmpty: boolean;
  dateFilterStart?: number;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'them',
  'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'whose', 'where',
  'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  've', 'ne', 'mi', 'ben', 'sen', 'biz', 'siz', 'bir', 'bu', 'su', 'o', 've', 'ile',
  'icin', 'için', 'gibi', 'kadar', 'var', 'yok', 'mi', 'mı', 'mu', 'mü',
]);

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[#*_~>\[\]()!|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function snippet(text: string, max = 120): string {
  const clean = stripMarkdown(text);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function tokenize(message: string): string[] {
  return message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ğüşıöç\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function parseDateFilter(message: string): number | undefined {
  const lower = message.toLowerCase();
  const now = new Date();

  if (/(bu ay|this month|aylik|aylık)/i.test(lower)) {
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }
  if (/(bu hafta|this week|haftalik|haftalık)/i.test(lower)) {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const start = new Date(now);
    start.setDate(now.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }
  if (/(bugun|bugün|today)/i.test(lower)) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }
  return undefined;
}

function scoreText(text: string, keywords: string[], createdAt?: number): number {
  const haystack = text.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (haystack.includes(kw)) score += 3;
  }
  if (createdAt) {
    const ageDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 5 - ageDays / 7);
  }
  return score;
}

function toMillis(value: unknown): number | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return undefined;
}

export async function buildWorkspaceContext(
  db: admin.firestore.Firestore,
  uid: string,
  message: string
): Promise<WorkspaceContext> {
  const keywords = tokenize(message);
  const dateFilterStart = parseDateFilter(message);

  const [notesSnap, bookmarksSnap, projectsSnap, todosSnap] = await Promise.all([
    db.collection('notes').where('ownerId', '==', uid).get(),
    db.collection('bookmarks').where('ownerId', '==', uid).get(),
    db.collection('projects').where('ownerId', '==', uid).get(),
    db.collection('todos').where('ownerId', '==', uid).get(),
  ]);

  let projectTasksDone = 0;
  let projectTasksTotal = 0;
  const ranked: RankedItem[] = [];

  for (const doc of notesSnap.docs) {
    const data = doc.data();
    const createdAt = toMillis(data.createdAt);
    if (dateFilterStart && createdAt && createdAt < dateFilterStart) continue;
    const title = (data.title as string) || 'Untitled note';
    const markdown = (data.markdown as string) || '';
    ranked.push({
      type: 'note',
      id: doc.id,
      title,
      snippet: snippet(markdown || title),
      createdAt,
      score: scoreText(`${title} ${markdown}`, keywords, createdAt),
    });
  }

  for (const doc of bookmarksSnap.docs) {
    const data = doc.data();
    const createdAt = toMillis(data.createdAt);
    if (dateFilterStart && createdAt && createdAt < dateFilterStart) continue;
    const title = (data.title as string) || (data.url as string) || 'Bookmark';
    const body = [data.description, data.personalNote].filter(Boolean).join(' ');
    ranked.push({
      type: 'bookmark',
      id: doc.id,
      title,
      snippet: snippet(body || title),
      status: data.status as string | undefined,
      createdAt,
      score: scoreText(`${title} ${body}`, keywords, createdAt),
    });
  }

  for (const doc of projectsSnap.docs) {
    const data = doc.data();
    const createdAt = toMillis(data.createdAt);
    if (dateFilterStart && createdAt && createdAt < dateFilterStart) continue;
    const title = (data.title as string) || 'Untitled project';
    const description = (data.description as string) || '';
    ranked.push({
      type: 'project',
      id: doc.id,
      title,
      snippet: snippet(description || title),
      createdAt,
      score: scoreText(`${title} ${description}`, keywords, createdAt),
    });

    const tasksSnap = await db.collection('projects').doc(doc.id).collection('tasks').get();
    for (const taskDoc of tasksSnap.docs) {
      const task = taskDoc.data();
      projectTasksTotal += 1;
      if (task.status === 'done') projectTasksDone += 1;
      const taskTitle = (task.title as string) || 'Task';
      const taskCreated = toMillis(task.createdAt);
      ranked.push({
        type: 'todo',
        id: taskDoc.id,
        title: `${title}: ${taskTitle}`,
        snippet: snippet(taskTitle),
        status: task.status as string | undefined,
        createdAt: taskCreated,
        score: scoreText(`${title} ${taskTitle}`, keywords, taskCreated) + 1,
      });
    }
  }

  for (const doc of todosSnap.docs) {
    const data = doc.data();
    const createdAt = toMillis(data.createdAt);
    if (dateFilterStart && createdAt && createdAt < dateFilterStart) continue;
    const title = (data.title as string) || 'Todo';
    const description = (data.description as string) || '';
    ranked.push({
      type: 'todo',
      id: doc.id,
      title,
      snippet: snippet(description || title),
      status: data.completed ? 'done' : 'open',
      createdAt,
      score: scoreText(`${title} ${description}`, keywords, createdAt),
    });
  }

  const openTodos = todosSnap.docs.filter((d) => !d.data().completed).length;
  const completedTodos = todosSnap.docs.filter((d) => d.data().completed).length;
  const inboxBookmarks = bookmarksSnap.docs.filter((d) => d.data().status === 'inbox').length;

  const stats: WorkspaceStats = {
    notes: notesSnap.size,
    bookmarks: bookmarksSnap.size,
    projects: projectsSnap.size,
    todos: todosSnap.size,
    openTodos,
    completedTodos,
    inboxBookmarks,
    projectTasksDone,
    projectTasksTotal,
  };

  const isEmpty =
    stats.notes === 0 &&
    stats.bookmarks === 0 &&
    stats.projects === 0 &&
    stats.todos === 0 &&
    stats.projectTasksTotal === 0;

  const sorted = ranked
    .sort((a, b) => {
      if (keywords.length === 0) {
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      }
      return b.score - a.score || (b.createdAt ?? 0) - (a.createdAt ?? 0);
    })
    .slice(0, keywords.length > 0 ? 12 : 8);

  return { stats, items: sorted, isEmpty, dateFilterStart };
}

export function formatContextForPrompt(context: WorkspaceContext): string {
  const statsLine = JSON.stringify(context.stats);
  const itemsLine = context.items
    .map(
      (item) =>
        `[${item.type}] id=${item.id} title=${item.title} status=${item.status ?? 'n/a'} snippet=${item.snippet}`
    )
    .join('\n');

  return `STATS: ${statsLine}\nITEMS:\n${itemsLine || '(none)'}`;
}