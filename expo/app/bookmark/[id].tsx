import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  TextInput,
} from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ExternalLink, Check, Archive, Trash2 } from 'lucide-react-native';
import { useBookmarkStore } from '@/providers/OfflineProvider';
import { Button } from '@/components/ui/Button';
import { getSourceLabel } from '@/utils/bookmark';
import { formatRelativeTime } from '@/utils/date';
import { BookmarkStatus } from '@/types';

export default function BookmarkDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bookmarks, openBookmark, updateBookmark, deleteBookmark } = useBookmarkStore();
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [personalNote, setPersonalNote] = useState('');

  const bookmark = useMemo(
    () => bookmarks.find((item) => item.id === id),
    [bookmarks, id]
  );

  if (!bookmark) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.missingText}>{t('bookmarkDetail.notFound')}</Text>
      </SafeAreaView>
    );
  }

  const handleOpenUrl = async () => {
    if (!bookmark.url) {
      showAppAlert(t('bookmarkDetail.noUrl'), t('bookmarkDetail.noLinkToOpen'));
      return;
    }
    await openBookmark(bookmark.id);
    await Linking.openURL(bookmark.url);
  };

  const handleStatusChange = async (status: BookmarkStatus) => {
    await updateBookmark(bookmark.id, {
      status,
      readAt: status === 'done' ? Date.now() : bookmark.readAt,
    });
  };

  const handleSaveNote = async () => {
    await updateBookmark(bookmark.id, { personalNote: personalNote.trim() || undefined });
    setIsEditingNote(false);
  };

  const handleDelete = () => {
    showAppAlert(t('bookmarkDetail.deleteTitle'), t('bookmarkDetail.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteBookmark(bookmark.id);
          router.back();
        },
      },
    ]);
  };

  const sourceLabel = bookmark.source ? getSourceLabel(bookmark.source) : t('sources.other');

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {bookmark.title || t('bookmarkDetail.bookmark')}
        </Text>
        <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
          <Trash2 size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {(bookmark.imagePreview || bookmark.screenshotUri) && (
          <Image
            source={{ uri: bookmark.imagePreview || bookmark.screenshotUri }}
            style={styles.heroImage}
          />
        )}

        <View style={styles.metaRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{sourceLabel}</Text>
          </View>
          <Text style={styles.metaText}>{formatRelativeTime(bookmark.createdAt)}</Text>
          <Text style={styles.metaText}>{t('bookmarkDetail.openedCount', { count: bookmark.openCount })}</Text>
        </View>

        <Text style={styles.title}>{bookmark.title || bookmark.url || t('common.untitled')}</Text>

        {bookmark.description ? (
          <Text style={styles.description}>{bookmark.description}</Text>
        ) : null}

        {bookmark.url ? (
          <Text style={styles.url} numberOfLines={2}>
            {bookmark.url}
          </Text>
        ) : null}

        {bookmark.tagNames.length > 0 && (
          <View style={styles.tagsRow}>
            {bookmark.tagNames.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.noteSection}>
          <Text style={styles.sectionLabel}>{t('bookmarkDetail.whySaved')}</Text>
          {isEditingNote ? (
            <>
              <TextInput
                style={styles.noteInput}
                value={personalNote}
                onChangeText={setPersonalNote}
                placeholder={t('bookmarkDetail.notePlaceholder')}
                multiline
              />
              <Button title={t('bookmarkDetail.saveNote')} onPress={handleSaveNote} />
            </>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setPersonalNote(bookmark.personalNote || '');
                setIsEditingNote(true);
              }}
            >
              <Text style={styles.noteText}>
                {bookmark.personalNote || t('bookmarkDetail.tapToAddNote')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actions}>
          {bookmark.url ? (
            <Button
              title={t('bookmarkDetail.openLink')}
              onPress={handleOpenUrl}
              style={styles.primaryButton}
            />
          ) : null}

          <View style={styles.statusRow}>
            <TouchableOpacity
              style={[styles.statusButton, bookmark.status === 'done' && styles.statusActive]}
              onPress={() => handleStatusChange('done')}
            >
              <Check size={16} color={bookmark.status === 'done' ? '#fff' : '#059669'} />
              <Text
                style={[
                  styles.statusButtonText,
                  bookmark.status === 'done' && styles.statusActiveText,
                ]}
              >
                {t('common.done')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusButton, bookmark.status === 'archived' && styles.statusActive]}
              onPress={() => handleStatusChange('archived')}
            >
              <Archive size={16} color={bookmark.status === 'archived' ? '#fff' : '#6B7280'} />
              <Text
                style={[
                  styles.statusButtonText,
                  bookmark.status === 'archived' && styles.statusActiveText,
                ]}
              >
                {t('bookmarkDetail.archive')}
              </Text>
            </TouchableOpacity>

            {bookmark.url ? (
              <TouchableOpacity style={styles.linkButton} onPress={handleOpenUrl}>
                <ExternalLink size={18} color="#EF4444" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  missingText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 12,
  },
  url: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tagChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  noteSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  noteInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    width: '100%',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  statusActiveText: {
    color: 'white',
  },
  linkButton: {
    marginLeft: 'auto',
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});