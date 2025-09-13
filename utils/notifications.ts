import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  type: 'task_reminder' | 'project_update' | 'invitation' | 'general';
  entityId?: string;
  entityType?: 'project' | 'task' | 'note' | 'bookmark';
  title: string;
  body: string;
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
      if (Platform.OS === 'web') {
        console.log('Notifications not supported on web');
        return;
      }

      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        console.log('Project ID not found');
        return;
      }

      this.expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Expo push token:', this.expoPushToken);

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
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
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        console.log('Local notifications not supported on web');
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: {
            type: data.type,
            entityId: data.entityId,
            entityType: data.entityType,
          },
        },
        trigger: trigger || null,
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
        title: 'Task Reminder',
        body: `Don't forget: ${taskTitle}`,
      },
      {
        date: reminderTime,
      } as Notifications.DateTriggerInput
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
        title: 'Project Nudge',
        body: `Time to work on: ${projectTitle}`,
      },
      {
        date: nudgeTime,
      } as Notifications.DateTriggerInput
    );
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    if (!listener || typeof listener !== 'function') {
      throw new Error('Listener must be a valid function');
    }
    return Notifications.addNotificationReceivedListener(listener);
  }

  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    if (!listener || typeof listener !== 'function') {
      throw new Error('Listener must be a valid function');
    }
    return Notifications.addNotificationResponseReceivedListener(listener);
  }
}

export const notificationService = NotificationService.getInstance();