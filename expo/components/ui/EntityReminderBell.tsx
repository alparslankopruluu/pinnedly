import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { ReminderPickerModal } from '@/components/ui/ReminderPickerModal';
import { ReminderSchedule } from '@/types';
import { useBookmarkStore, useNoteStore } from '@/providers/OfflineProvider';
import { useTodoStore } from '@/store/useTodoStore';
import { normalizeReminderSchedule } from '@/services/entityReminders';

interface EntityReminderBellProps {
  entityType: 'bookmark' | 'note' | 'todo';
  entityId: string;
  title: string;
  createdAt: number;
  schedule?: ReminderSchedule | null;
  size?: number;
  hitSlop?: number;
}

export function EntityReminderBell({
  entityType,
  entityId,
  title,
  createdAt,
  schedule,
  size = 18,
  hitSlop = 8,
}: EntityReminderBellProps) {
  const [open, setOpen] = useState(false);
  const { updateBookmark } = useBookmarkStore();
  const { updateNote } = useNoteStore();
  const { updateTodo } = useTodoStore();

  const normalized = normalizeReminderSchedule(schedule);
  const isActive =
    normalized.enabled &&
    (normalized.intervalDays.length > 0 || (normalized.customDates?.length ?? 0) > 0);

  const handleSave = async (nextSchedule: ReminderSchedule) => {
    if (entityType === 'bookmark') {
      await updateBookmark(entityId, { reminderSchedule: nextSchedule });
      return;
    }
    if (entityType === 'note') {
      await updateNote(entityId, { reminderSchedule: nextSchedule });
      return;
    }
    await updateTodo(entityId, { reminderSchedule: nextSchedule });
  };

  return (
    <>
      <Pressable
        style={styles.button}
        hitSlop={hitSlop}
        onPress={(e) => {
          e.stopPropagation?.();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Reminder"
      >
        <Bell size={size} color={isActive ? '#4F46E5' : '#9CA3AF'} fill={isActive ? '#4F46E5' : 'transparent'} />
      </Pressable>

      <ReminderPickerModal
        visible={open}
        onClose={() => setOpen(false)}
        title={title}
        schedule={schedule}
        onSave={handleSave}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 4,
  },
});