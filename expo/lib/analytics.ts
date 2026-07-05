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

const analytics = getAnalytics();

export async function initializeAnalytics(): Promise<void> {
  try {
    await setAnalyticsCollectionEnabled(analytics, true);
  } catch (error) {
    console.warn('Analytics init failed:', error);
  }
}

export async function logScreenView(screenName: string, screenClass?: string): Promise<void> {
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