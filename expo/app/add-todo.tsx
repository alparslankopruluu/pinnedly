import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Calendar, Flag } from 'lucide-react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTodoStore } from '@/store/useTodoStore';
import { TodoItem } from '@/types';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { useTrackFormOpen } from '@/hooks/useTrackFormOpen';
import { CategoryPicker } from '@/components/ui/CategoryPicker';
import { ContentCategoryId, DEFAULT_CONTENT_CATEGORY } from '@/constants/contentCategories';

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function dueDateToTimestamp(date: Date): number {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized.getTime();
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export default function AddTodoScreen() {
  useTrackFormOpen('todo');
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const priorityOptions = useMemo(
    () => [
      { id: 'high' as TodoItem['priority'], label: t('todos.filters.high'), color: '#EF4444' },
      { id: 'medium' as TodoItem['priority'], label: t('todos.filters.medium'), color: '#F59E0B' },
      { id: 'low' as TodoItem['priority'], label: t('todos.filters.low'), color: '#6B7280' },
    ],
    [t]
  );
  const params = useLocalSearchParams<{ id?: string }>();
  const { allTodos, createTodo, updateTodo } = useTodoStore();

  const isEditing = !!params.id;
  const existingTodo = isEditing ? allTodos.find((t: TodoItem) => t.id === params.id) : undefined;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TodoItem['priority']>('medium');
  const [hasDueDate, setHasDueDate] = useState(false);
  const [dueDate, setDueDate] = useState<Date>(startOfToday());
  const [completed, setCompleted] = useState(false);
  const [category, setCategory] = useState<ContentCategoryId>(DEFAULT_CONTENT_CATEGORY);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (existingTodo) {
      setTitle(existingTodo.title);
      setDescription(existingTodo.description || '');
      setPriority(existingTodo.priority);
      setCategory(existingTodo.category ?? DEFAULT_CONTENT_CATEGORY);
      setCompleted(existingTodo.completed);
      if (existingTodo.dueDate) {
        setHasDueDate(true);
        setDueDate(new Date(existingTodo.dueDate));
      }
    }
  }, [existingTodo]);

  const parseDueDate = (): number | undefined => {
    if (!hasDueDate) return undefined;
    return dueDateToTimestamp(dueDate);
  };

  const handleDueDateToggle = useCallback((enabled: boolean) => {
    setHasDueDate(enabled);
    if (enabled) {
      setDueDate(startOfToday());
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (savingRef.current) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showAppAlert(t('common.required'), t('addTodo.alerts.enterTitle'));
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      if (isEditing && existingTodo) {
        await updateTodo(existingTodo.id, {
          title: trimmedTitle,
          description: description.trim() || undefined,
          priority,
          completed,
          dueDate: parseDueDate(),
          category,
        });
      } else {
        await createTodo({
          title: trimmedTitle,
          description: description.trim() || undefined,
          priority,
          completed: false,
          dueDate: parseDueDate(),
          category,
        });
      }
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('addTodo.saveFailed');
      showAppAlert(t('common.error'), msg, undefined, { variant: 'error' });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [title, description, priority, completed, hasDueDate, dueDate, category, isEditing, existingTodo, createTodo, updateTodo, t]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          title: isEditing ? t('addTodo.editTodo') : t('addTodo.newTodo'),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <X size={24} color="#6B7280" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              style={({ pressed }) => [
                styles.headerSaveButton,
                !title.trim() && styles.headerSaveButtonDisabled,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleSave}
              disabled={saving || !title.trim()}
            >
              <Text style={[styles.headerSaveButtonText, !title.trim() && styles.headerSaveButtonTextDisabled]}>
                {saving ? t('common.saving') : t('common.save')}
              </Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text style={styles.label}>{t('addTodo.title')}</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={t('addTodo.titlePlaceholder')}
          placeholderTextColor="#9CA3AF"
          autoFocus={!isEditing}
          maxLength={200}
        />

        {/* Description */}
        <Text style={styles.label}>{t('addTodo.descriptionOptional')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('addTodo.detailsPlaceholder')}
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={1000}
        />

        {/* Category */}
        <CategoryPicker
          label={t('categories.label')}
          value={category}
          onChange={setCategory}
        />

        {/* Priority */}
        <Text style={[styles.label, { marginTop: 20 }]}>{t('addTodo.priority')}</Text>
        <View style={styles.priorityRow}>
          {priorityOptions.map((opt) => (
            <Pressable
              key={opt.id}
              style={({ pressed }) => [
                styles.priorityOption,
                priority === opt.id && { backgroundColor: opt.color + '18', borderColor: opt.color },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => setPriority(opt.id)}
            >
              <Flag size={14} color={priority === opt.id ? opt.color : '#9CA3AF'} />
              <Text style={[styles.priorityText, priority === opt.id && { color: opt.color, fontWeight: '600' }]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Due date toggle */}
        <View style={styles.switchRow}>
          <View style={styles.switchLabelRow}>
            <Calendar size={18} color="#6B7280" />
            <Text style={styles.switchLabel}>{t('addTodo.setDueDate')}</Text>
          </View>
          <Switch
            value={hasDueDate}
            onValueChange={handleDueDateToggle}
            trackColor={{ false: '#E5E7EB', true: '#FECACA' }}
            thumbColor={hasDueDate ? '#EF4444' : '#D1D5DB'}
          />
        </View>

        {hasDueDate && (
          <View style={styles.dateInputContainer}>
            <DatePickerField
              value={dueDate}
              onChange={setDueDate}
              minimumDate={isEditing ? undefined : startOfToday()}
              placeholder={t('addTodo.dueDatePlaceholder')}
            />
            <View style={styles.quickDates}>
              {[
                { label: t('addTodo.quickDates.today'), date: startOfToday() },
                { label: t('addTodo.quickDates.tomorrow'), date: addDays(startOfToday(), 1) },
                { label: t('addTodo.quickDates.nextWeek'), date: addDays(startOfToday(), 7) },
              ].map((qd) => (
                <Pressable
                  key={qd.label}
                  style={({ pressed }) => [
                    styles.quickDateChip,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => setDueDate(qd.date)}
                >
                  <Text style={styles.quickDateText}>{qd.label}</Text>
                </Pressable>
              ))}
              <Pressable
                style={({ pressed }) => [
                  styles.quickDateChip,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => handleDueDateToggle(false)}
              >
                <Text style={styles.quickDateText}>{t('addTodo.quickDates.clear')}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Mark completed (edit only) */}
        {isEditing && (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('addTodo.markCompleted')}</Text>
            <Switch
              value={completed}
              onValueChange={setCompleted}
              trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
              thumbColor={completed ? '#10B981' : '#D1D5DB'}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerSaveButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    marginRight: 4,
  },
  headerSaveButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  headerSaveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  headerSaveButtonTextDisabled: {
    color: '#9CA3AF',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 100,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingVertical: 8,
  },
  switchLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  dateInputContainer: {
    marginTop: 8,
  },
  quickDates: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  quickDateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickDateText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
});
