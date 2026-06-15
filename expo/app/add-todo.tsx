import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Calendar, Flag } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTodoStore } from '@/store/useTodoStore';
import { TodoItem, ID } from '@/types';

const PRIORITY_OPTIONS: { id: TodoItem['priority']; label: string; color: string }[] = [
  { id: 'high', label: 'High', color: '#EF4444' },
  { id: 'medium', label: 'Medium', color: '#F59E0B' },
  { id: 'low', label: 'Low', color: '#6B7280' },
];

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function AddTodoScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const { allTodos, createTodo, updateTodo } = useTodoStore();

  const isEditing = !!params.id;
  const existingTodo = isEditing ? allTodos.find((t: TodoItem) => t.id === params.id) : undefined;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TodoItem['priority']>('medium');
  const [hasDueDate, setHasDueDate] = useState(false);
  const [dueDate, setDueDate] = useState(formatDate(new Date()));
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingTodo) {
      setTitle(existingTodo.title);
      setDescription(existingTodo.description || '');
      setPriority(existingTodo.priority);
      setCompleted(existingTodo.completed);
      if (existingTodo.dueDate) {
        setHasDueDate(true);
        setDueDate(formatDate(new Date(existingTodo.dueDate)));
      }
    }
  }, [existingTodo]);

  const handleDateChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9-]/g, '');
    setDueDate(cleaned);
  }, []);

  const parseDueDate = (): number | undefined => {
    if (!hasDueDate || !dueDate.trim()) return undefined;
    const parsed = new Date(dueDate);
    if (isNaN(parsed.getTime())) return undefined;
    return parsed.getTime();
  };

  const handleSave = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Required', 'Please enter a task title.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && existingTodo) {
        await updateTodo(existingTodo.id, {
          title: trimmedTitle,
          description: description.trim() || undefined,
          priority,
          completed,
          dueDate: parseDueDate(),
        });
      } else {
        await createTodo({
          title: trimmedTitle,
          description: description.trim() || undefined,
          priority,
          completed: false,
          dueDate: parseDueDate(),
        });
      }
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save todo';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }, [title, description, priority, completed, hasDueDate, dueDate, isEditing, existingTodo, createTodo, updateTodo]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.closeButton, pressed && styles.buttonPressed]}
          onPress={() => router.back()}
        >
          <X size={24} color="#6B7280" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Todo' : 'New Todo'}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            !title.trim() && styles.saveButtonDisabled,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleSave}
          disabled={saving || !title.trim()}
        >
          <Text style={[styles.saveButtonText, !title.trim() && styles.saveButtonTextDisabled]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="What do you need to do?"
          placeholderTextColor="#9CA3AF"
          autoFocus={!isEditing}
          maxLength={200}
        />

        {/* Description */}
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Add details..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={1000}
        />

        {/* Priority */}
        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITY_OPTIONS.map((opt) => (
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
            <Text style={styles.switchLabel}>Set due date</Text>
          </View>
          <Switch
            value={hasDueDate}
            onValueChange={setHasDueDate}
            trackColor={{ false: '#E5E7EB', true: '#FECACA' }}
            thumbColor={hasDueDate ? '#EF4444' : '#D1D5DB'}
          />
        </View>

        {hasDueDate && (
          <View style={styles.dateInputContainer}>
            <TextInput
              style={styles.input}
              value={dueDate}
              onChangeText={handleDateChange}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              keyboardType="numbers-and-punctuation"
            />
            <View style={styles.quickDates}>
              {[
                { label: 'Today', getDate: () => formatDate(new Date()) },
                { label: 'Tomorrow', getDate: () => formatDate(new Date(Date.now() + 86400000)) },
                { label: 'Next Week', getDate: () => formatDate(new Date(Date.now() + 7 * 86400000)) },
                { label: 'Clear', getDate: () => '' },
              ].map((qd) => (
                <Pressable
                  key={qd.label}
                  style={({ pressed }) => [
                    styles.quickDateChip,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => setDueDate(qd.getDate())}
                >
                  <Text style={styles.quickDateText}>{qd.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Mark completed (edit only) */}
        {isEditing && (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Mark as completed</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  saveButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  saveButtonTextDisabled: {
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
