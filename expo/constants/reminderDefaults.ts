export const DEFAULT_REMINDER_INTERVALS = [1, 3, 7, 30] as const;

export const REMINDER_PRESET_DAYS = [1, 3, 7, 30] as const;

export type ReminderPresetDays = (typeof REMINDER_PRESET_DAYS)[number];

export function getDefaultReminderSchedule() {
  return {
    enabled: true,
    intervalDays: [...DEFAULT_REMINDER_INTERVALS],
    customDates: [] as number[],
  };
}