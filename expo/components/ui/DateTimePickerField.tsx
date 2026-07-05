import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';

interface DateTimePickerFieldProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  placeholder?: string;
}

function formatDisplayDateTime(date: Date, locale: string): string {
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function DateTimePickerField({
  value,
  onChange,
  minimumDate,
  placeholder,
}: DateTimePickerFieldProps) {
  const { t, i18n } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);
  const [iosDraft, setIosDraft] = useState(value);

  const openPicker = useCallback(() => {
    setIosDraft(value);
    setShowPicker(true);
  }, [value]);

  const handleAndroidChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      setShowPicker(false);
      if (event.type === 'set' && selectedDate) {
        onChange(selectedDate);
      }
    },
    [onChange]
  );

  const handleIosChange = useCallback((_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setIosDraft(selectedDate);
    }
  }, []);

  const confirmIos = useCallback(() => {
    onChange(iosDraft);
    setShowPicker(false);
  }, [iosDraft, onChange]);

  const cancelIos = useCallback(() => {
    setShowPicker(false);
  }, []);

  const displayText = formatDisplayDateTime(value, i18n.language);

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={placeholder ?? t('common.selectDateTime')}
      >
        <Calendar size={18} color="#6B7280" />
        <Text style={styles.fieldText}>{displayText}</Text>
      </Pressable>

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={value}
          mode="datetime"
          display="default"
          minimumDate={minimumDate}
          onChange={handleAndroidChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={showPicker} transparent animationType="slide" onRequestClose={cancelIos}>
          <Pressable style={styles.modalOverlay} onPress={cancelIos}>
            <Pressable style={styles.iosSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.iosHeader}>
                <Pressable onPress={cancelIos} hitSlop={8}>
                  <Text style={styles.iosCancel}>{t('common.cancel')}</Text>
                </Pressable>
                <Text style={styles.iosTitle}>{t('common.selectDateTime')}</Text>
                <Pressable onPress={confirmIos} hitSlop={8}>
                  <Text style={styles.iosDone}>{t('common.ok')}</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={iosDraft}
                mode="datetime"
                display="spinner"
                minimumDate={minimumDate}
                onChange={handleIosChange}
                style={styles.iosPicker}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fieldPressed: {
    opacity: 0.85,
  },
  fieldText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  iosSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  iosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  iosTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  iosCancel: {
    fontSize: 16,
    color: '#6B7280',
  },
  iosDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },
  iosPicker: {
    height: 216,
  },
});