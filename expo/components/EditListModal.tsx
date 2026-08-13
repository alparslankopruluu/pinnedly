import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { showAppAlert } from '@/providers/DialogProvider';
import { X } from '@/components/icons/lucide';
import { BookmarkListForm } from '@/components/BookmarkListForm';
import { useBookmarkLists } from '@/store/useBookmarkListStore';
import { BookmarkList, Visibility } from '@/types';
import { useReducedMotion } from '@/hooks/useAccessibilityPreferences';

interface EditListModalProps {
  visible: boolean;
  onClose: () => void;
  list: BookmarkList;
  onUpdated: (list: BookmarkList) => void;
}

export function EditListModal({ visible, onClose, list, onUpdated }: EditListModalProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const { updateList, isUpdating } = useBookmarkLists();
  const [name, setName] = useState<string>(list.name);
  const [description, setDescription] = useState<string>(list.description ?? '');
  const [visibility, setVisibility] = useState<Visibility>(list.visibility ?? 'private');

  useEffect(() => {
    if (visible) {
      setName(list.name);
      setDescription(list.description ?? '');
      setVisibility(list.visibility ?? 'private');
    }
  }, [visible, list]);

  const handleSave = async () => {
    if (!name.trim()) {
      showAppAlert(t('common.error'), t('createList.alerts.enterName'), undefined, { variant: 'error' });
      return;
    }

    try {
      const updated = await updateList(list.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
        isPublic: visibility === 'public',
      });
      onUpdated(updated);
      onClose();
    } catch (error) {
      console.error('Failed to update list:', error);
      showAppAlert(t('common.error'), t('bookmarkList.alerts.updateFailed'), undefined, { variant: 'error' });
    }
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
          <Text style={styles.title}>{t('bookmarkList.edit.title')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          <BookmarkListForm
            name={name}
            onNameChange={setName}
            description={description}
            onDescriptionChange={setDescription}
            visibility={visibility}
            onVisibilityChange={setVisibility}
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={isUpdating}>
            <Text style={styles.cancelButtonText}>{t('bookmarkList.edit.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, (!name.trim() || isUpdating) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!name.trim() || isUpdating}
          >
            <Text style={styles.saveButtonText}>
              {isUpdating ? t('common.saving') : t('bookmarkList.edit.save')}
            </Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
    backgroundColor: '#FFFFFF',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 10,
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 10,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
