import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, Globe, Lock, Users } from 'lucide-react-native';
import { router } from 'expo-router';
import { useNoteStore } from '@/providers/OfflineProvider';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeTime } from '@/utils/date';
import { Note, Visibility } from '@/types';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { EntityReminderBell } from '@/components/ui/EntityReminderBell';
import { getCategoryDef } from '@/constants/contentCategories';

export default function NotesScreen() {
  const { t } = useTranslation();
  const { notes } = useNoteStore();
  const insets = useSafeAreaInsets();

  const uniqueNotes = useMemo(() => {
    const seenIds = new Set<string>();
    return notes.filter((note) => {
      if (seenIds.has(note.id)) return false;
      seenIds.add(note.id);
      return true;
    });
  }, [notes]);

  const getVisibilityIcon = (visibility: Visibility) => {
    switch (visibility) {
      case 'public':
        return <Globe size={14} color="#10B981" />;
      case 'shared':
        return <Users size={14} color="#6366F1" />;
      default:
        return <Lock size={14} color="#9CA3AF" />;
    }
  };

  const getVisibilityLabel = (visibility: Visibility): string => {
    switch (visibility) {
      case 'public': return t('common.public');
      case 'shared': return t('common.shared');
      default: return t('common.private');
    }
  };

  const renderNote = ({ item }: { item: Note }) => {
    const categoryDef = getCategoryDef(item.category);
    return (
    <Pressable
      style={({ pressed }) => [
        styles.noteCard,
        { borderLeftColor: categoryDef.color },
        pressed && styles.noteCardPressed
      ]}
      onPress={() => router.push(`/note/${item.id}` as any)}
    >
      <View style={styles.noteHeader}>
        <View style={styles.noteHeaderLeft}>
          <FileText size={20} color={categoryDef.color} />
          <CategoryBadge category={item.category} compact />
          <View style={styles.visibilityBadge}>
            {getVisibilityIcon(item.visibility)}
            <Text style={styles.visibilityLabel}>{getVisibilityLabel(item.visibility)}</Text>
          </View>
        </View>
        <View style={styles.noteHeaderRight}>
          <EntityReminderBell
            entityType="note"
            entityId={item.id}
            title={item.title}
            createdAt={item.createdAt}
            schedule={item.reminderSchedule}
            size={16}
          />
          <Text style={styles.noteDate}>
            {formatRelativeTime(item.updatedAt)}
          </Text>
        </View>
      </View>
      <Text style={styles.noteTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.notePreview} numberOfLines={3}>
        {item.markdown.replace(/[#*`_\][]/g, '').trim() || t('common.noContent')}
      </Text>
      {item.links.length > 0 && (
        <View style={styles.linksContainer}>
          <Text style={styles.linksText}>
            {t('common.linkedItems', { count: item.links.length })}
          </Text>
        </View>
      )}
    </Pressable>
  );
  };

  const renderEmpty = () => (
    <EmptyState
      title={t('notes.empty.title')}
      description={t('notes.empty.description')}
      buttonTitle={t('notes.empty.button')}
      onButtonPress={() => router.push('/add-note')}
      icon={<FileText size={48} color="#D1D5DB" />}
    />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={uniqueNotes}
        renderItem={renderNote}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          uniqueNotes.length === 0 ? styles.emptyContainer : styles.listContainer,
          { paddingBottom: insets.bottom + 80 }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  noteCard: {
    backgroundColor: 'white',
    borderLeftWidth: 4,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  noteCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noteHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  visibilityLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  noteDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  notePreview: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  linksContainer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  linksText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
