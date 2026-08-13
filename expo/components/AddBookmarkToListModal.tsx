import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { showAppAlert } from '@/providers/DialogProvider';
import { X, Check, Plus } from '@/components/icons/lucide';
import { useBookmarkStore } from '@/providers/OfflineProvider';
import { useBookmarkLists } from '@/store/useBookmarkListStore';
import { BookmarkList, Bookmark } from '@/types';
import { useReducedMotion } from '@/hooks/useAccessibilityPreferences';

interface AddBookmarkToListModalProps {
  visible: boolean;
  onClose: () => void;
  list: BookmarkList;
  onChanged: () => void;
}

export function AddBookmarkToListModal({ visible, onClose, list, onChanged }: AddBookmarkToListModalProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const { bookmarks } = useBookmarkStore();
  const { addBookmarkToList, removeBookmarkFromList, isUpdatingMembership } = useBookmarkLists();

  const handleToggle = async (bookmark: Bookmark) => {
    const isIncluded = list.bookmarkIds.includes(bookmark.id);
    try {
      if (isIncluded) {
        await removeBookmarkFromList(list.id, bookmark.id);
      } else {
        await addBookmarkToList(list.id, bookmark.id);
      }
      onChanged();
    } catch (error) {
      console.error('Failed to update list membership:', error);
      showAppAlert(
        t('common.error'),
        t(isIncluded ? 'bookmarkList.alerts.removeBookmarkFailed' : 'bookmarkList.alerts.addBookmarkFailed'),
        undefined,
        { variant: 'error' }
      );
    }
  };

  const handleCreateNew = () => {
    onClose();
    router.push({ pathname: '/add-bookmark', params: { listId: list.id } });
  };

  const renderItem = ({ item }: { item: Bookmark }) => {
    const selected = list.bookmarkIds.includes(item.id);
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => handleToggle(item)}
        disabled={isUpdatingMembership}
      >
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected ? <Check size={15} color="#FFFFFF" /> : null}
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title || item.url || t('common.untitled')}
          </Text>
          {item.url ? <Text style={styles.rowSubtitle} numberOfLines={1}>{item.url}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType={reduceMotion ? 'none' : 'slide'}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']} accessibilityViewIsModal>
        <View style={styles.header}>
          <Text style={styles.title}>{t('bookmarkList.addBookmarks.title')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={bookmarks}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{t('bookmarkList.addBookmarks.empty')}</Text>
          }
        />

        <TouchableOpacity style={styles.createButton} onPress={handleCreateNew}>
          <Plus size={20} color="#4F46E5" />
          <Text style={styles.createButtonText}>{t('bookmarkList.addBookmarks.createNew')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 8,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8E8E93',
    marginTop: 32,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 10,
    backgroundColor: '#F0F0FF',
  },
  createButtonText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
});
