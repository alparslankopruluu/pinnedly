import type { ContentCategoryId } from '@/constants/contentCategories';

export type ID = string;

export type Tag = {
  id: ID;
  name: string;
  color?: string;
};

export type CommentNote = {
  id: ID;
  text: string;
  createdAt: number;
};

export type BookmarkSource =
  | 'twitter'
  | 'instagram'
  | 'medium'
  | 'linkedin'
  | 'wikipedia'
  | 'youtube'
  | 'reddit'
  | 'substack'
  | 'github'
  | 'other';

export type BookmarkStatus = 'inbox' | 'reading' | 'done' | 'archived';

export type ReminderSchedule = {
  enabled: boolean;
  intervalDays: number[];
  customDates?: number[];
};

export type Bookmark = {
  id: ID;
  url?: string;
  title?: string;
  description?: string;
  imagePreview?: string;
  screenshotUri?: string;
  notes: CommentNote[];
  tags: Tag[];
  tagNames: string[];
  personalNote?: string;
  status: BookmarkStatus;
  reminderAt?: number;
  readAt?: number;
  createdAt: number;
  openCount: number;
  lastOpenedAt?: number;
  source?: BookmarkSource;
  userId: ID;
  visibility: Visibility;
  category?: ContentCategoryId;
  reminderSchedule?: ReminderSchedule;
};

export type Task = {
  id: ID;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
  dueDate?: number;
  notes?: string;
  projectId: ID;
  category?: ContentCategoryId;
};

export type Project = {
  id: ID;
  title: string;
  description?: string;
  coverImage?: string;
  gallery?: string[];
  deadline?: number;
  tasks: Task[];
  createdAt: number;
  updatedAt: number;
  userId: ID;
  visibility: Visibility;
  collaborators: ProjectCollaborator[];
};

export type Note = {
  id: ID;
  title: string;
  markdown: string;
  links: { type: 'bookmark' | 'project'; id: ID }[];
  createdAt: number;
  updatedAt: number;
  userId: ID;
  visibility: Visibility;
  sharedWith?: ID[]; // User IDs this note is shared with
  category?: ContentCategoryId;
  reminderSchedule?: ReminderSchedule;
};

export type ActivityItem = {
  id: ID;
  type: 'bookmark_added' | 'bookmark_opened' | 'task_completed' | 'project_created' | 'note_added' | 'todo_added' | 'todo_completed';
  title: string;
  subtitle?: string;
  timestamp: number;
  relatedId?: ID;
};

export type Preferences = {
  theme: 'light' | 'dark' | 'system';
  dailyGoal?: number;
  weeklyGoal?: number;
  notificationsEnabled: boolean;
};

// Auth & Social Types
export type User = {
  id: ID;
  handle: string;
  email: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  isVerified?: boolean;
  followerCount: number;
  followingCount: number;
  createdAt: number;
};

export type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

export type FollowRelation = {
  id: ID;
  followerId: ID;
  followingId: ID;
  createdAt: number;
};

// Expanded visibility: private (only you), shared (specific people), public (everyone)
export type Visibility = 'private' | 'shared' | 'public';

export type ShareItem = {
  id: ID;
  fromUserId: ID;
  toUserId: ID;
  itemType: 'bookmark' | 'note' | 'project';
  itemId: ID;
  message?: string;
  isRead: boolean;
  createdAt: number;
};

export type ProjectRole = 'owner' | 'editor' | 'viewer';

export type ProjectCollaborator = {
  id: ID;
  projectId: ID;
  userId: ID;
  role: ProjectRole;
  invitedAt: number;
  acceptedAt?: number;
};

export type PublicSlug = {
  id: ID;
  slug: string;
  itemType: 'bookmark' | 'note' | 'project';
  itemId: ID;
  userId: ID;
  createdAt: number;
};

export type SharePermission = 'view' | 'edit';

export type EntityShare = {
  id: ID;
  entityId: ID;
  entityType: 'note' | 'bookmark' | 'list' | 'project';
  userId: ID;
  permission: SharePermission;
  createdBy: ID;
  createdAt: number;
  user?: User;
};

export type ShareRequest = {
  entityId: ID;
  entityType: 'note' | 'bookmark' | 'list' | 'project';
  userEmail: string;
  permission: SharePermission;
};

export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  image: string;
};

export type BookmarkList = {
  id: ID;
  name: string;
  description?: string;
  isPublic: boolean;
  ownerId: ID;
  followerCount: number;
  bookmarks: Bookmark[];
  createdAt: number;
  updatedAt: number;
};

export type ListFollower = {
  id: ID;
  listId: ID;
  userId: ID;
  createdAt: number;
};

export type OnboardingState = {
  isCompleted: boolean;
  currentStep: number;
  hasSeenWelcome: boolean;
};

// Todo type for standalone task tracking
export type TodoItem = {
  id: ID;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: number;
  projectId?: ID; // Optional link to project
  noteId?: ID; // Optional link to note
  userId: ID;
  createdAt: number;
  updatedAt: number;
  category?: ContentCategoryId;
  reminderSchedule?: ReminderSchedule;
};
