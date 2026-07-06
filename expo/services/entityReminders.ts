import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '@/utils/notifications';
import { ReminderSchedule } from '@/types';
import { getDefaultReminderSchedule } from '@/constants/reminderDefaults';

export type ReminderEntityType = 'bookmark' | 'note' | 'todo';

const STORAGE_PREFIX = 'entity_reminder_ids';

function storageKey(entityType: ReminderEntityType, entityId: string): string {
  return `${STORAGE_PREFIX}:${entityType}:${entityId}`;
}

async function getStoredIds(entityType: ReminderEntityType, entityId: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(storageKey(entityType, entityId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function setStoredIds(
  entityType: ReminderEntityType,
  entityId: string,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) {
    await AsyncStorage.removeItem(storageKey(entityType, entityId));
    return;
  }
  await AsyncStorage.setItem(storageKey(entityType, entityId), JSON.stringify(ids));
}

export async function cancelEntityReminders(
  entityType: ReminderEntityType,
  entityId: string
): Promise<void> {
  const ids = await getStoredIds(entityType, entityId);
  await Promise.all(ids.map((id) => notificationService.cancelNotification(id)));
  await setStoredIds(entityType, entityId, []);
}

function buildTriggerDates(baseTime: number, schedule: ReminderSchedule): Date[] {
  const dates: Date[] = [];
  const now = Date.now();

  for (const days of schedule.intervalDays) {
    const trigger = new Date(baseTime + days * 24 * 60 * 60 * 1000);
    if (trigger.getTime() > now) {
      dates.push(trigger);
    }
  }

  for (const customAt of schedule.customDates ?? []) {
    if (customAt > now) {
      dates.push(new Date(customAt));
    }
  }

  return dates.sort((a, b) => a.getTime() - b.getTime());
}

export interface ScheduleEntityRemindersInput {
  entityType: ReminderEntityType;
  entityId: string;
  title: string;
  baseTime: number;
  schedule?: ReminderSchedule | null;
}

export async function scheduleEntityReminders(input: ScheduleEntityRemindersInput): Promise<void> {
  const schedule = input.schedule ?? getDefaultReminderSchedule();
  if (!schedule.enabled) return;

  await cancelEntityReminders(input.entityType, input.entityId);

  const triggerDates = buildTriggerDates(input.baseTime, schedule);
  const notificationIds: string[] = [];

  for (const triggerDate of triggerDates) {
    const id = await notificationService.scheduleEntityReminder(
      input.entityType,
      input.entityId,
      input.title,
      triggerDate
    );
    if (id) notificationIds.push(id);
  }

  await setStoredIds(input.entityType, input.entityId, notificationIds);
}

export async function rescheduleEntityReminders(
  input: ScheduleEntityRemindersInput
): Promise<void> {
  if (input.schedule && !input.schedule.enabled) {
    await cancelEntityReminders(input.entityType, input.entityId);
    return;
  }
  await scheduleEntityReminders(input);
}

export function mapReminderScheduleFromFirestore(data: unknown): ReminderSchedule | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const raw = data as Record<string, unknown>;
  if (typeof raw.enabled !== 'boolean') return undefined;
  return {
    enabled: raw.enabled,
    intervalDays: Array.isArray(raw.intervalDays)
      ? (raw.intervalDays as number[])
      : [...getDefaultReminderSchedule().intervalDays],
    customDates: Array.isArray(raw.customDates) ? (raw.customDates as number[]) : [],
  };
}

export function normalizeReminderSchedule(
  schedule?: ReminderSchedule | null
): ReminderSchedule {
  if (!schedule) return getDefaultReminderSchedule();
  return {
    enabled: schedule.enabled ?? true,
    intervalDays:
      schedule.intervalDays?.length > 0
        ? [...schedule.intervalDays]
        : [...getDefaultReminderSchedule().intervalDays],
    customDates: schedule.customDates ? [...schedule.customDates] : [],
  };
}

export async function hasActiveReminders(
  entityType: ReminderEntityType,
  entityId: string
): Promise<boolean> {
  const ids = await getStoredIds(entityType, entityId);
  return ids.length > 0;
}