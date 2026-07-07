import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { X } from '@/components/icons/lucide';
import { useProjectStore } from '@/providers/OfflineProvider';
import { useAuth } from '@/store/useAuthStore';
import { Button } from '@/components/ui/Button';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { ScreenFooter } from '@/components/ui/ScreenFooter';
import { useTrackFormOpen } from '@/hooks/useTrackFormOpen';

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function deadlineToTimestamp(date: Date): number {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized.getTime();
}

export default function AddProjectScreen() {
  useTrackFormOpen('project');
  const { t } = useTranslation();
  const { createProject } = useProjectStore();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);

  const handleSave = async () => {
    if (!title.trim()) {
      showAppAlert(t('common.error'), t('addProject.alerts.enterTitle'), undefined, { variant: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      await createProject({
        title: title.trim(),
        description: description.trim() || undefined,
        deadline: deadline ? deadlineToTimestamp(deadline) : undefined,
        visibility: 'private',
        userId: user?.id || '',
      });
      router.back();
    } catch (err) {
      console.error('Failed to create project:', err);
      showAppAlert(t('common.error'), t('addProject.alerts.createFailed'), undefined, { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const setQuickDeadline = (days: number) => {
    setDeadline(addDays(startOfToday(), days));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen 
        options={{ 
          title: t('addProject.title'),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <X size={24} color="#111827" />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Title */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('addProject.projectTitle')}</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={t('addProject.titlePlaceholder')}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('addProject.descriptionOptional')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('addProject.descriptionPlaceholder')}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Deadline */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('addProject.deadlineOptional')}</Text>

              <View style={styles.deadlinePicker}>
                <DatePickerField
                  value={deadline}
                  onChange={setDeadline}
                  minimumDate={startOfToday()}
                  placeholder={t('addProject.deadlinePlaceholder')}
                />
                <View style={styles.quickDeadlines}>
                  <TouchableOpacity
                    style={styles.quickDeadlineButton}
                    onPress={() => setQuickDeadline(7)}
                  >
                    <Text style={styles.quickDeadlineText}>{t('addProject.deadlines.oneWeek')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickDeadlineButton}
                    onPress={() => setQuickDeadline(30)}
                  >
                    <Text style={styles.quickDeadlineText}>{t('addProject.deadlines.oneMonth')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickDeadlineButton}
                    onPress={() => setQuickDeadline(90)}
                  >
                    <Text style={styles.quickDeadlineText}>{t('addProject.deadlines.threeMonths')}</Text>
                  </TouchableOpacity>
                  {deadline && (
                    <TouchableOpacity
                      style={styles.quickDeadlineButton}
                      onPress={() => setDeadline(null)}
                    >
                      <Text style={styles.quickDeadlineText}>{t('addTodo.quickDates.clear')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {t('addProject.info')}
              </Text>
            </View>
          </View>
        </ScrollView>

        <ScreenFooter>
          <Button
            title={isSaving ? t('common.saving') : t('addProject.createProject')}
            onPress={handleSave}
            disabled={isSaving}
            style={styles.saveButton}
          />
        </ScreenFooter>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  deadlinePicker: {
    gap: 12,
  },
  quickDeadlines: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickDeadlineButton: {
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickDeadlineText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  saveButton: {
    width: '100%',
  },
});