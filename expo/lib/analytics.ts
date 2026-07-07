import {
  getAnalytics,
  logEvent,
  logLogin,
  logSignUp,
  setAnalyticsCollectionEnabled,
  setUserId,
  setUserProperty,
} from '@react-native-firebase/analytics';

export type AuthMethod = 'email' | 'google' | 'apple' | 'phone';

export type ContentType = 'bookmark' | 'note' | 'project' | 'todo' | 'list' | 'profile';

export type SubscriptionAction =
  | 'modal_viewed'
  | 'plan_selected'
  | 'subscribe_started'
  | 'subscribe_completed'
  | 'subscribe_failed'
  | 'subscribe_cancelled';

const analytics = getAnalytics();

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
  try {
    await setAnalyticsCollectionEnabled(analytics, true);
  } catch (error) {
    console.warn('Analytics init failed:', error);
  }
}

export async function logAnalyticsScreenView(segments: string[]): Promise<void> {
  const screenName = resolveAnalyticsScreen(segments);
  try {
    await logEvent(analytics, 'screen_view', {
      screen_name: screenName,
      screen_class: screenName,
    });
  } catch (error) {
    console.warn('Analytics screen view failed:', error);
  }
}

/** @deprecated Use logAnalyticsScreenView with segments */
export async function logScreenViewLegacy(screenName: string, screenClass?: string): Promise<void> {
  try {
    await logEvent(analytics, 'screen_view', {
      screen_name: screenName,
      screen_class: screenClass ?? screenName,
    });
  } catch (error) {
    console.warn('Analytics screen view failed:', error);
  }
}

export async function trackButtonPress(
  screen: string,
  buttonId: string,
  action?: string
): Promise<void> {
  try {
    await logEvent(analytics, 'button_press', {
      screen,
      button_id: buttonId,
      action: action ?? 'press',
    });
  } catch (error) {
    console.warn('Analytics button event failed:', error);
  }
}

export async function trackAuthEvent(
  event: 'login' | 'sign_up' | 'logout' | 'password_reset' | 'phone_code_sent' | 'auth_failed',
  method?: AuthMethod,
  extra?: Record<string, string>
): Promise<void> {
  try {
    if (event === 'login' && method) {
      await logLogin(analytics, { method });
      return;
    }
    if (event === 'sign_up' && method) {
      await logSignUp(analytics, { method });
      return;
    }
    const customEvent = event as 'logout' | 'password_reset' | 'phone_code_sent' | 'auth_failed';
    await logEvent(analytics, customEvent, {
      ...(method ? { method } : {}),
      ...extra,
    });
  } catch (error) {
    console.warn('Analytics auth event failed:', error);
  }
}

export async function trackAccountEvent(
  event: 'account_deleted' | 'profile_updated' | 'data_exported',
  extra?: Record<string, string>
): Promise<void> {
  try {
    await logEvent(analytics, event, extra ?? {});
  } catch (error) {
    console.warn('Analytics account event failed:', error);
  }
}

export async function trackOnboardingEvent(
  event: 'onboarding_started' | 'onboarding_step' | 'onboarding_completed' | 'onboarding_skipped',
  extra?: Record<string, string | number>
): Promise<void> {
  try {
    await logEvent(analytics, event, extra ?? {});
  } catch (error) {
    console.warn('Analytics onboarding event failed:', error);
  }
}

export async function trackSubscriptionEvent(
  action: SubscriptionAction,
  extra?: Record<string, string>
): Promise<void> {
  try {
    await logEvent(analytics, `subscription_${action}`, extra ?? {});
  } catch (error) {
    console.warn('Analytics subscription event failed:', error);
  }
}

export async function trackContentOpen(
  contentType: ContentType,
  contentId?: string,
  source?: string
): Promise<void> {
  try {
    await logEvent(analytics, 'content_opened', {
      content_type: contentType,
      ...(contentId ? { content_id: contentId } : {}),
      ...(source ? { source } : {}),
    });
    if (contentType === 'note' && contentId) {
      await trackNoteEvent('note_opened', contentId);
    } else if (
      (contentType === 'bookmark' || contentType === 'project' || contentType === 'todo') &&
      contentId
    ) {
      await trackEntityEvent(contentType, 'opened', contentId);
    }
  } catch (error) {
    console.warn('Analytics content open failed:', error);
  }
}

export async function trackFormOpen(
  form: 'bookmark' | 'note' | 'project' | 'todo' | 'list',
  source?: string
): Promise<void> {
  try {
    await logEvent(analytics, 'form_opened', {
      form_type: form,
      ...(source ? { source } : {}),
    });
  } catch (error) {
    console.warn('Analytics form open failed:', error);
  }
}

export async function trackNoteEvent(
  event: 'note_created' | 'note_updated' | 'note_deleted' | 'note_opened',
  noteId?: string
): Promise<void> {
  try {
    await logEvent(analytics, event, noteId ? { note_id: noteId } : {});
  } catch (error) {
    console.warn('Analytics note event failed:', error);
  }
}

export async function trackEntityEvent(
  entity: 'bookmark' | 'project' | 'todo',
  action: 'created' | 'updated' | 'deleted' | 'opened',
  entityId?: string
): Promise<void> {
  try {
    await logEvent(analytics, `${entity}_${action}`, entityId ? { entity_id: entityId } : {});
  } catch (error) {
    console.warn('Analytics entity event failed:', error);
  }
}

export async function setAnalyticsUserId(userId: string | null): Promise<void> {
  try {
    await setUserId(analytics, userId);
  } catch (error) {
    console.warn('Analytics setUserId failed:', error);
  }
}

export async function setAnalyticsUserProperties(props: Record<string, string | null>): Promise<void> {
  try {
    await Promise.all(
      Object.entries(props).map(([key, value]) =>
        setUserProperty(analytics, key, value)
      )
    );
  } catch (error) {
    console.warn('Analytics setUserProperty failed:', error);
  }
}
