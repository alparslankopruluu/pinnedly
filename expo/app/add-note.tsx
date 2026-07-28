import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { X, Lock, Globe, Users } from '@/components/icons/lucide';
import { useNoteStore } from '@/providers/OfflineProvider';
import { Button } from '@/components/ui/Button';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { ScreenFooter } from '@/components/ui/ScreenFooter';
import { Visibility } from '@/types';
import { useTrackFormOpen } from '@/hooks/useTrackFormOpen';
import { CategoryPicker } from '@/components/ui/CategoryPicker';
import { ContentCategoryId, DEFAULT_CONTENT_CATEGORY } from '@/constants/contentCategories';
import { useSubscriptionGate } from '@/hooks/useSubscriptionGate';

export default function AddNoteScreen() {
  useTrackFormOpen('note');
  const { t } = useTranslation();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const { createNote, notes } = useNoteStore();
  const { ensureCreate, ensure, handleAccessError } = useSubscriptionGate();

  const visibilityOptions = useMemo(
    () => [
      {
        value: 'private' as Visibility,
        label: t('common.private'),
        description: t('addNote.visibilityOptions.private'),
        icon: Lock,
        color: '#6B7280',
      },
      {
        value: 'shared' as Visibility,
        label: t('common.shared'),
        description: t('addNote.visibilityOptions.shared'),
        icon: Users,
        color: '#6366F1',
      },
      {
        value: 'public' as Visibility,
        label: t('common.public'),
        description: t('addNote.visibilityOptions.public'),
        icon: Globe,
        color: '#10B981',
      },
    ],
    [t]
  );
  const [title, setTitle] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [category, setCategory] = useState<ContentCategoryId>(DEFAULT_CONTENT_CATEGORY);
  const [isSaving, setIsSaving] = useState(false);

  const selectedVisibility = visibilityOptions.find((o) => o.value === visibility) ?? visibilityOptions[0];

  const handleSave = async () => {
    // Creating a note is a Cloud Function round-trip, so without this guard
    // repeated taps queued duplicate notes while the screen looked frozen.
    if (isSaving) return;
    if (!title.trim()) {
      showAppAlert(t('common.error'), t('addNote.alerts.enterTitle'), undefined, { variant: 'error' });
      return;
    }
    if (!ensureCreate('notes', notes.length)) return;
    if (visibility !== 'private' && !ensure('sharing')) return;

    setIsSaving(true);
    try {
      await createNote({
        title: title.trim(),
        markdown: markdown.trim(),
        visibility,
        category,
        links: projectId
          ? [{ type: 'project', id: projectId }]
          : [],
      });
    } catch (err) {
      console.error('Failed to create note:', err);
      if (handleAccessError(err)) return;
      showAppAlert(t('common.error'), t('addNote.alerts.createFailed'), undefined, { variant: 'error' });
      return;
    } finally {
      setIsSaving(false);
    }

    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: t('addNote.title'),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <X size={24} color="#111827" />
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Title — primary identity */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('addNote.noteTitle')}</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={t('addNote.titlePlaceholder')}
                placeholderTextColor="#9CA3AF"
                accessibilityLabel={t('addNote.noteTitle')}
                returnKeyType="next"
              />
            </View>

            {/* Content first — writing should not sit below bulky meta controls */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('addNote.content')}</Text>
              <RichTextEditor
                value={markdown}
                onChangeText={(text, md) => setMarkdown(md)}
                placeholder={t('addNote.contentPlaceholder')}
                toolbarHint={t('addNote.toolbarHint')}
                autoFocus={false}
              />
              <Text style={styles.editorHint}>{t('addNote.editorHint')}</Text>
            </View>

            {/* Compact meta: category + visibility */}
            <View style={styles.metaSection}>
              <CategoryPicker
                label={t('categories.label')}
                value={category}
                onChange={setCategory}
              />

              <View style={styles.visibilityBlock}>
                <Text style={styles.label}>{t('addNote.visibility')}</Text>
                <View
                  style={styles.segment}
                  accessibilityRole="radiogroup"
                  accessibilityLabel={t('addNote.visibility')}
                >
                  {visibilityOptions.map((option) => {
                    const selected = visibility === option.value;
                    const Icon = option.icon;
                    return (
                      <Pressable
                        key={option.value}
                        style={({ pressed }) => [
                          styles.segmentItem,
                          selected && {
                            backgroundColor: option.color + '14',
                            borderColor: option.color,
                          },
                          pressed && styles.segmentItemPressed,
                        ]}
                        onPress={() => setVisibility(option.value)}
                        accessibilityRole="radio"
                        accessibilityLabel={option.label}
                        accessibilityHint={option.description}
                        accessibilityState={{ checked: selected }}
                      >
                        <Icon size={15} color={selected ? option.color : '#6B7280'} />
                        <Text
                          style={[
                            styles.segmentLabel,
                            selected && { color: option.color, fontWeight: '600' },
                          ]}
                          numberOfLines={1}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[styles.visibilityCaption, { color: selectedVisibility.color }]}>
                  {selectedVisibility.description}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <ScreenFooter>
          <Button
            title={isSaving ? t('common.saving') : t('addNote.createNote')}
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  section: {
    marginBottom: 18,
  },
  metaSection: {
    gap: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editorHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    color: '#9CA3AF',
  },
  visibilityBlock: {
    gap: 0,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 40,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  segmentItemPressed: {
    opacity: 0.85,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  visibilityCaption: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    color: '#6B7280',
  },
  saveButton: {
    width: '100%',
  },
});
