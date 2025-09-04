import { Bookmark, Project, Tag, ActivityItem } from '@/types';

export const seedTags: Tag[] = [
  { id: '1', name: 'Work', color: '#EF4444' },
  { id: '2', name: 'Design', color: '#3B82F6' },
  { id: '3', name: 'Development', color: '#10B981' },
  { id: '4', name: 'Productivity', color: '#F59E0B' },
  { id: '5', name: 'Learning', color: '#8B5CF6' },
];

export const seedBookmarks: Bookmark[] = [
  {
    id: '1',
    url: 'https://medium.com/design/ui-ux-design-trends-2024',
    title: 'UI/UX Design Trends 2024',
    description: 'A comprehensive guide to understanding and implementing the latest design trends in user interface and user experience design.',
    imagePreview: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=200&fit=crop',
    tags: [seedTags[1], seedTags[4]],
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    openCount: 12,
    lastOpenedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    source: 'medium',
    notes: [],
  },
  {
    id: '2',
    url: 'https://blog.figma.com/mobile-app-design-principles',
    title: 'Mobile App Design Principles',
    description: 'Explore the best practices for creating intuitive and engaging mobile app interfaces that users love.',
    imagePreview: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=200&fit=crop',
    tags: [seedTags[1], seedTags[2]],
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
    openCount: 5,
    lastOpenedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    source: 'other',
    notes: [],
  },
  {
    id: '3',
    url: 'https://css-tricks.com/mastering-color-theory',
    title: 'Mastering Color Theory in Design',
    description: 'Learn how to effectively use color palettes in your designs to evoke emotions and create visual hierarchy.',
    imagePreview: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&h=200&fit=crop',
    tags: [seedTags[1]],
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 1 week ago
    openCount: 2,
    lastOpenedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    source: 'other',
    notes: [],
  },
  {
    id: '4',
    url: 'https://webdesign.tutsplus.com/responsive-web-design-tutorial',
    title: 'Responsive Web Design Tutorial',
    description: 'A step-by-step tutorial on creating responsive web designs that adapt seamlessly to different screen sizes.',
    imagePreview: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400&h=200&fit=crop',
    tags: [seedTags[2], seedTags[4]],
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
    openCount: 1,
    lastOpenedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    source: 'other',
    notes: [],
  },
  {
    id: '5',
    url: 'https://uxdesign.cc/minimalism-in-web-design',
    title: 'The Art of Minimalism in Web Design',
    description: 'Discover how less can be more in creating elegant and user-friendly websites.',
    imagePreview: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&h=200&fit=crop',
    tags: [seedTags[1]],
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000, // 2 weeks ago
    openCount: 0,
    source: 'other',
    notes: [],
  },
];

export const seedProjects: Project[] = [
  {
    id: '1',
    title: 'Marketing Campaign',
    description: 'Q1 marketing campaign for product launch',
    coverImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop',
    deadline: Date.now() + 14 * 24 * 60 * 60 * 1000, // 2 weeks from now
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    tasks: [
      {
        id: '1',
        title: 'Create brand guidelines',
        status: 'done',
        projectId: '1',
      },
      {
        id: '2',
        title: 'Design social media assets',
        status: 'done',
        projectId: '1',
      },
      {
        id: '3',
        title: 'Write copy for ads',
        status: 'in-progress',
        projectId: '1',
      },
      {
        id: '4',
        title: 'Set up tracking pixels',
        status: 'todo',
        projectId: '1',
      },
      {
        id: '5',
        title: 'Launch campaign',
        status: 'todo',
        dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
        projectId: '1',
      },
    ],
  },
  {
    id: '2',
    title: 'Product Launch',
    description: 'New mobile app launch preparation',
    coverImage: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=200&fit=crop',
    deadline: Date.now() + 30 * 24 * 60 * 60 * 1000, // 1 month from now
    createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    tasks: [
      {
        id: '6',
        title: 'Finalize UI Kit',
        status: 'todo',
        dueDate: Date.now() + 1 * 24 * 60 * 60 * 1000, // Due tomorrow
        projectId: '2',
      },
      {
        id: '7',
        title: 'User Interviews',
        status: 'todo',
        dueDate: Date.now() - 1 * 24 * 60 * 60 * 1000, // Overdue
        projectId: '2',
      },
      {
        id: '8',
        title: 'Beta testing',
        status: 'todo',
        projectId: '2',
      },
    ],
  },
];

export const seedActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'task_completed',
    title: 'Completed: Design System Review',
    subtitle: 'Project X',
    timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: '2',
    type: 'note_added',
    title: 'Added: User Interview Notes',
    subtitle: 'Project Y',
    timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
  {
    id: '3',
    type: 'bookmark_added',
    title: 'Saved bookmark',
    subtitle: 'The Future of AI in Design',
    timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000,
  },
];