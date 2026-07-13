import { Platform } from 'react-native';

declare const require: <T = unknown>(moduleName: string) => T;

export type AuthMethod = 'email' | 'google' | 'apple' | 'phone';

export type ContentType = 'bookmark' | 'note' | 'project' | 'todo' | 'list' | 'profile';

export type SubscriptionAction =
  | 'modal_viewed'
  | 'plan_selected'
  | 'subscribe_started'
  | 'subscribe_completed'
  | 'subscribe_failed'
  | 'subscribe_cancelled'
  | 'feature_blocked'
  | 'restore_started'
  | 'restore_completed'
  | 'restore_failed';

const SCREEN_MAP: Record<string, string> = {
  '(auth)/welcome': 'Welcome',
  '(auth)/sign-in': 'Sign In',
  '(auth)/sign-up': 'Sign Up',
  '(auth)/phone-sign-in': 'Phone Sign In',
  '(auth)/forgot-password': 'Forgot Password',
  onboarding: 'Onboarding',
  '(tabs)': 'Home',
  '(tabs)/index': 'Home',
  '(tabs)/bookmarks': 'Bookmarks',
  '(tabs)/notes': 'Notes',
  '(tabs)/projects': 'Projects',
  '(tabs)/todos': 'Todos',
  '(tabs)/profile': 'Profile',
  settings: 'Settings',
  'ai-chat': 'AI Assistant',
  'add-bookmark': 'Create Bookmark',
  'add-note': 'Create Note',
  'add-project': 'Create Project',
  'add-todo': 'Create Todo',
  'share-inbox': 'Share Inbox',
  'people-search': 'Find People',
  'discover-lists': 'Discover Lists',
  'create-list': 'Create List',
  '+not-found': 'Not Found',
};

function analyticsModule() {
  return require<typeof import('@react-native-firebase/analytics')>(
    '@react-native-firebase/analytics'
  );
}

function getNativeAnalytics() {
  return analyticsModule().getAnalytics();
}

async function withNativeAnalytics(
  action: (module: ReturnType<typeof analyticsModule>, analytics: unknown) => Promise<void>
): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await action(analyticsModule(), getNativeAnalytics());
  } catch (error) {
    console.warn('Analytics event failed:', error);
  }
}

export function resolveAnalyticsScreen(segments: string[]): string {
  const path = segments.filter(Boolean);
  if (path.length === 0) return 'Home';

  const joined = path.join('/');
  if (SCREEN_MAP[joined]) return SCREEN_MAP[joined];

  const [root, second] = path;
  if (root === 'bookmark' && second) return 'Bookmark Detail';
  if (root === 'note' && second) return 'Note Detail';
  if (root === 'project' && second) return 'Project Detail';
  if (root === 'profile' && second) return 'User Profile';
  if (root === 'bookmark-list' && second) return 'Bookmark List';

  return joined.replace(/[()]/g, '').replace(/\//g, ' / ') || 'Home';
}

export async function initializeAnalytics(): Promise<void> {
  await withNativeAnalytics(async (analytics, instance) => {
    await analytics.setAnalyticsCollectionEnabled(instance as never, true);
  });
}

export async function logAnalyticsScreenView(segments: string[]): Promise<void> {
  const screenName = resolveAnalyticsScreen(segments);
  await withNativeAnalytics(async (analytics, instance) => {
    await analytics.logEvent(instance as never, 'screen_view', {
      screen_name: screenName,
      screen_class: screenName,
    });
  });
}

/** @deprecated Use logAnalyticsScreenView with segments */
export async function logScreenViewLegacy(screenName: string, screenClass?: string): Promise<void> {
  await withNativeAnalytics(async (analytics, instance) => {
    await analytics.logEvent(instance as never, 'screen_view', {
      screen_name: screenName,
      screen_class: screenClass ?? screenName,
    });
  });
}

export async function trackButtonPress(
  screen: string,
  buttonId: string,
  action?: string
): Promise<void> {
  await withNativeAnalytics(async (analytics, instance) => {
    await analytics.logEvent(instance as never, 'button_press', {
      screen,
      button_id: buttonId,
      action: action ?? 'press',
    });
  });
}

export async function trackAuthEvent(
  event: 'login' | 'sign_up' | 'logout' | 'password_reset' | 'phone_code_sent' | 'auth_failed',
  method?: AuthMethod,
  extra?: Record<string, string>
): Promise<void> {
  await withNativeAnalytics(async (analytics, instance) => {
    if (event === 'login' && method) {
      await analytics.logLogin(instance as never, { method });
      return;
    }
    if (event === 'sign_up' && method) {
      await analytics.logSignUp(instance as never, { method });
      return;
    }
    const customEvent = event as 'logout' | 'password_reset' | 'phone_code_sent' | 'auth_failed';
    await analytics.logEvent(instance as never, customEvent, {
      ...(method ? { method } : {}),
      ...extra,
    });
  });
}

export async function trackAccountEvent(
  event: 'account_deleted' | 'profile_updated' | 'data_exported',
  extra?: Record<string, string>
): Promise<void> {
  await withNativeAnalytics(async (analytics, instance) => {
    await analytics.logEvent(instance as never, event, extra ?? {});
  });
}

export async function trackOnboardingEvent(
  event: 'onboarding_started' | 'onboarding_step' | 'onboarding_completed' | 'onboarding_skipped',
  extra?: Record<string, string | number>
): Promise<void> {
  await withNativeAnalytics(async (analytics, instance) => {
    await analytics.logEvent(instance as never, event, extra ?? {});
  });
}

export async function trackSubscriptionEvent(
  action: SubscriptionAction,
  extra?: Record<string, string>
): Promise<void> {
  await withNativeAnalytics(async (analytics, instance) => {
    await analytics.logEvent(instance as never, `subscription_${action}`, extra ?? {});
  });
}

export async function trackContentOpen(
  contentType: ContentType,
  contentId?: string,
  source?: string
): Promise<void> {
  await withNativeAnalytics(async (analytics, instance) => {
    await analytics.logEvent(instance as never, 'content_opened', {
      content_type: contentType,
      ...(contentId ? { content_id: contentId } : {}),
      ...(source ? { source } : {}),
    });
  });

  if (contentType === 'note' && contentId) {
    await trackNoteEvent('note_opened', contentId);
  } else if (
    (contentType === 'bookmark' || contentType === 'project' || contentType === 'todo') &&
    contentId
  ) {
    await trackEntityEvent(contentType, 'opened', contentId);
  }
}

export async function trackFormOpen(
  form: 'bookmark' | 'note' | 'project' | 'todo' | 'list',
  source?: string
): Promise<void> {
  await withNativeAnalytics(async (analytics, instance) => {
    await analytics.logEvent(instance as never, 'form_opened', {
      form_type: form,
      ...(source ? { source } : {}),
    });
  });
}

export async function trackNoteEvent(
  event: 'note_created' | 'note_updated' | 'note_deleted' | 'note_opened',
  noteId?: string
): Promise<void> {
  await withNativeAnalytics(async (analytics, instance) => {
    await analytics.logEvent(instance as never, event, noteId ? { note_id: noteId } : {});
  });
}

export async function trackEntityEvent(
  entity: 'bookmark' | 'project' | 'todo',
  action: 'created' | 'updated' | 'deleted' | 'opened',
  entityId?: string
): Promise<void> {
  await withNativeAnalytics(async (analytics, instance) => {
    await analytics.logEvent(
      instance as never,
      `${entity}_${action}`,
      entityId ? { entity_id: entityId } : {}
    );
  });
}

export async function setAnalyticsUserId(userId: string | null): Promise<void> {
  await withNativeAnalytics(async (analytics, instance) => {
    await analytics.setUserId(instance as never, userId);
  });
}

export async function setAnalyticsUserProperties(props: Record<string, string | null>): Promise<void> {
  await withNativeAnalytics(async (analytics, instance) => {
    await Promise.all(
      Object.entries(props).map(([key, value]) =>
        analytics.setUserProperty(instance as never, key, value)
      )
    );
  });
}
