import type * as NotificationsTypes from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import i18n from '@/lib/i18n';
import { platformCapabilities } from '@/utils/platform';

declare const require: <T = unknown>(moduleName: string) => T;

export interface NotificationData {
  type: 'task_reminder' | 'project_update' | 'invitation' | 'general' | 'bookmark_digest' | 'entity_reminder';
  entityId?: string;
  entityType?: 'project' | 'task' | 'note' | 'bookmark' | 'todo';
  title: string;
  body: string;
}

type NotificationSubscription = {
  remove: () => void;
};

function notifications() {
  return require<typeof import('expo-notifications')>('expo-notifications');
}

function configureNotificationHandler(): void {
  if (!platformCapabilities.supportsLocalNotifications) return;

  notifications().setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

configureNotificationHandler();

function dateTrigger(reminderTime: Date): NotificationsTypes.DateTriggerInput {
  return {
    type: notifications().SchedulableTriggerInputTypes.DATE,
    date: reminderTime,
  };
}

export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    try {
      if (!platformCapabilities.supportsPushNotifications) {
        if (__DEV__) console.debug('Notifications not supported on this platform');
        return;
      }

      const notificationModule = notifications();

      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return;
      }

      const { status: existingStatus } = await notificationModule.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await notificationModule.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        if (__DEV__) {
          console.debug('Skipping push token registration: EAS project ID not configured.');
        }
        return;
      }

      this.expoPushToken = (await notificationModule.getExpoPushTokenAsync({ projectId })).data;
      console.log('Expo push token:', this.expoPushToken);

      if (Platform.OS === 'android') {
        await notificationModule.setNotificationChannelAsync('default', {
          name: 'default',
          importance: notificationModule.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  async scheduleLocalNotification(
    data: NotificationData,
    trigger?: NotificationsTypes.NotificationTriggerInput
  ): Promise<string | null> {
    try {
      if (!platformCapabilities.supportsLocalNotifications) {
        if (__DEV__) console.debug('Local notifications not supported on this platform');
        return null;
      }

      const notificationId = await notifications().scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: {
            type: data.type,
            entityId: data.entityId,
            entityType: data.entityType,
          },
        },
        trigger: trigger ?? null,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  async scheduleTaskReminder(
    taskId: string,
    taskTitle: string,
    reminderTime: Date
  ): Promise<string | null> {
    return this.scheduleLocalNotification(
      {
        type: 'task_reminder',
        entityId: taskId,
        entityType: 'task',
        title: i18n.t('notifications.taskReminder.title'),
        body: i18n.t('notifications.taskReminder.body', { taskTitle }),
      },
      dateTrigger(reminderTime)
    );
  }

  async scheduleProjectNudge(
    projectId: string,
    projectTitle: string,
    nudgeTime: Date
  ): Promise<string | null> {
    return this.scheduleLocalNotification(
      {
        type: 'project_update',
        entityId: projectId,
        entityType: 'project',
        title: i18n.t('notifications.projectNudge.title'),
        body: i18n.t('notifications.projectNudge.body', { projectTitle }),
      },
      dateTrigger(nudgeTime)
    );
  }

  async scheduleBookmarkDigest(unreadCount: number, triggerTime: Date): Promise<string | null> {
    return this.scheduleLocalNotification(
      {
        type: 'bookmark_digest',
        entityType: 'bookmark',
        entityId: 'inbox',
        title: i18n.t('notifications.bookmarkDigest.title'),
        body: i18n.t('notifications.bookmarkDigest.body', { count: unreadCount, defaultValue: '' }),
      },
      dateTrigger(triggerTime)
    );
  }

  async scheduleEntityReminder(
    entityType: 'bookmark' | 'note' | 'todo',
    entityId: string,
    entityTitle: string,
    triggerTime: Date
  ): Promise<string | null> {
    return this.scheduleLocalNotification(
      {
        type: 'entity_reminder',
        entityId,
        entityType,
        title: i18n.t(`notifications.entityReminder.${entityType}.title`),
        body: i18n.t(`notifications.entityReminder.${entityType}.body`, {
          title: entityTitle,
        }),
      },
      dateTrigger(triggerTime)
    );
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      if (!platformCapabilities.supportsLocalNotifications) return;
      await notifications().cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      if (!platformCapabilities.supportsLocalNotifications) return;
      await notifications().cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  addNotificationReceivedListener(
    listener: (notification: NotificationsTypes.Notification) => void
  ): NotificationSubscription {
    if (!listener || typeof listener !== 'function') {
      throw new Error('Listener must be a valid function');
    }
    if (!platformCapabilities.supportsLocalNotifications) return { remove: () => undefined };
    return notifications().addNotificationReceivedListener(listener);
  }

  addNotificationResponseReceivedListener(
    listener: (response: NotificationsTypes.NotificationResponse) => void
  ): NotificationSubscription {
    if (!listener || typeof listener !== 'function') {
      throw new Error('Listener must be a valid function');
    }
    if (!platformCapabilities.supportsLocalNotifications) return { remove: () => undefined };
    return notifications().addNotificationResponseReceivedListener(listener);
  }
}

export const notificationService = NotificationService.getInstance();
