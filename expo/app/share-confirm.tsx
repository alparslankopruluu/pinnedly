import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { X } from '@/components/icons/lucide';
import { Button } from '@/components/ui/Button';
import { ScreenFooter } from '@/components/ui/ScreenFooter';
import {
  SharedBookmarkDraft,
  createSharedBookmark,
  getPendingSharedBookmarkDraft,
  clearPendingSharedBookmarkDraft,
} from '@/services/saveSharedBookmark';

export default function ShareConfirmScreen() {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<SharedBookmarkDraft | null>(null);
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const pending = getPendingSharedBookmarkDraft();
    if (!pending) {
      router.back();
      return;
    }
    setDraft(pending);
    setTitle(pending.title ?? '');
  }, []);

  const handleCancel = () => {
    clearPendingSharedBookmarkDraft();
    router.back();
  };

  const handleConfirm = async () => {
    if (!draft) return;
    setIsSaving(true);
    try {
      const bookmark = await createSharedBookmark({
        ...draft,
        title: title.trim() || undefined,
      });
      clearPendingSharedBookmarkDraft();
      router.replace(`/bookmark/${bookmark.id}` as never);
    } catch (error) {
      showAppAlert(
        t('shareIntent.couldNotSave'),
        error instanceof Error ? error.message : t('shareConfirm.saveFailed')
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!draft) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: t('shareConfirm.title'),
          headerLeft: () => (
            <TouchableOpacity onPress={handleCancel} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <X size={24} color="#111827" />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {draft.imagePreview && (
              <View style={styles.section}>
                <Image source={{ uri: draft.imagePreview }} style={styles.previewImage} />
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.url} numberOfLines={2}>{draft.url}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>{t('shareConfirm.titleLabel')}</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={t('shareConfirm.titlePlaceholder')}
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
            </View>
          </View>
        </ScrollView>

        <ScreenFooter>
          <View style={styles.footerActions}>
            <Button
              title={t('shareConfirm.cancel')}
              onPress={handleCancel}
              variant="outline"
              style={styles.cancelButton}
              disabled={isSaving}
            />
            <Button
              title={isSaving ? t('common.saving') : t('shareConfirm.confirm')}
              onPress={handleConfirm}
              disabled={isSaving}
              style={styles.saveButton}
            />
          </View>
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
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  url: {
    fontSize: 14,
    color: '#6B7280',
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
  footerActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});
