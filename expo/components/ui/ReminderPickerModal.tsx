import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Switch,
  ScrollView,
} from 'react-native';
import { X, Bell } from 'lucide-react-native';
import { DateTimePickerField } from '@/components/ui/DateTimePickerField';
import { ReminderSchedule } from '@/types';
import { REMINDER_PRESET_DAYS } from '@/constants/reminderDefaults';
import { normalizeReminderSchedule } from '@/services/entityReminders';

interface ReminderPickerModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  schedule?: ReminderSchedule | null;
  onSave: (schedule: ReminderSchedule) => Promise<void>;
}

export function ReminderPickerModal({
  visible,
  onClose,
  title,
  schedule,
  onSave,
}: ReminderPickerModalProps) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(true);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 7, 30]);
  const [customDates, setCustomDates] = useState<number[]>([]);
  const [customPickerDate, setCustomPickerDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const normalized = normalizeReminderSchedule(schedule);
    setEnabled(normalized.enabled);
    setSelectedDays(normalized.intervalDays);
    setCustomDates(normalized.customDates ?? []);
  }, [visible, schedule]);

  const presetLabels = useMemo(
    () =>
      ({
        1: t('reminders.presets.1d'),
        3: t('reminders.presets.3d'),
        7: t('reminders.presets.7d'),
        30: t('reminders.presets.30d'),
      }) as Record<number, string>,
    [t]
  );

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const addCustomDate = () => {
    const ts = customPickerDate.getTime();
    if (ts <= Date.now()) return;
    setCustomDates((prev) => (prev.includes(ts) ? prev : [...prev, ts].sort((a, b) => a - b)));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave({
        enabled,
        intervalDays: selectedDays.length > 0 ? selectedDays : [...REMINDER_PRESET_DAYS],
        customDates,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Bell size={20} color="#4F46E5" />
              <Text style={styles.headerTitle}>{t('reminders.title')}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={24} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.entityTitle} numberOfLines={2}>
              {title}
            </Text>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                {enabled ? t('reminders.enabled') : t('reminders.disabled')}
              </Text>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ false: '#E5E7EB', true: '#C7D2FE' }}
                thumbColor={enabled ? '#4F46E5' : '#9CA3AF'}
              />
            </View>

            {enabled ? (
              <>
                <Text style={styles.sectionLabel}>{t('reminders.presetsLabel')}</Text>
                <View style={styles.chipRow}>
                  {REMINDER_PRESET_DAYS.map((day) => {
                    const active = selectedDays.includes(day);
                    return (
                      <Pressable
                        key={day}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => toggleDay(day)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {presetLabels[day]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.sectionLabel}>{t('reminders.custom')}</Text>
                <DateTimePickerField
                  value={customPickerDate}
                  onChange={setCustomPickerDate}
                  minimumDate={new Date()}
                />
                <Pressable style={styles.addCustomButton} onPress={addCustomDate}>
                  <Text style={styles.addCustomButtonText}>{t('reminders.addCustom')}</Text>
                </Pressable>

                {customDates.length > 0 ? (
                  <View style={styles.customList}>
                    {customDates.map((ts) => (
                      <View key={ts} style={styles.customItem}>
                        <Text style={styles.customItemText}>
                          {new Date(ts).toLocaleString()}
                        </Text>
                        <Pressable onPress={() => setCustomDates((prev) => prev.filter((d) => d !== ts))}>
                          <X size={16} color="#9CA3AF" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? t('common.saving') : t('common.save')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  entityTitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  chipActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  chipTextActive: {
    color: '#4F46E5',
  },
  addCustomButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  addCustomButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  customList: {
    gap: 8,
    marginBottom: 8,
  },
  customItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },
  customItemText: {
    fontSize: 14,
    color: '#374151',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});