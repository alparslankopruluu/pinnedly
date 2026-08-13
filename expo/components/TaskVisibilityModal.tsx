import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { showAppAlert } from '@/providers/DialogProvider';
import { X, Check, Eye, EyeOff } from '@/components/icons/lucide';
import { useProjectStore } from '@/providers/OfflineProvider';
import { Task, ProjectCollaborator, User } from '@/types';
import { useReducedMotion } from '@/hooks/useAccessibilityPreferences';

type MemberWithUser = ProjectCollaborator & { user?: User };

interface TaskVisibilityModalProps {
  visible: boolean;
  onClose: () => void;
  task: Task;
  members: MemberWithUser[];
}

export function TaskVisibilityModal({ visible, onClose, task, members }: TaskVisibilityModalProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const { setTaskVisibility, grantTaskVisibility, revokeTaskVisibility } = useProjectStore();
  const [isSaving, setIsSaving] = useState(false);

  const isRestricted = task.visibility === 'private';
  const sharedWith = new Set(task.sharedWith ?? []);
  // The project owner can always see every task regardless of restriction, so
  // granting/revoking access for that row would be meaningless.
  const grantableMembers = members.filter((member) => member.role !== 'owner');

  const handleSetRestricted = async (restricted: boolean) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await setTaskVisibility(task.id, restricted ? 'private' : 'shared');
    } catch (error) {
      showAppAlert(t('common.error'), error instanceof Error ? error.message : t('common.error'), undefined, { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleMember = async (userId: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (sharedWith.has(userId)) {
        await revokeTaskVisibility(task.id, userId);
      } else {
        await grantTaskVisibility(task.id, userId);
      }
    } catch (error) {
      showAppAlert(t('common.error'), error instanceof Error ? error.message : t('common.error'), undefined, { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const renderMember = ({ item }: { item: MemberWithUser }) => {
    const selected = sharedWith.has(item.userId);
    return (
      <TouchableOpacity style={styles.memberRow} onPress={() => handleToggleMember(item.userId)}>
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected ? <Check size={15} color="#FFFFFF" /> : null}
        </View>
        <Text style={styles.memberName}>
          {item.user?.displayName || item.user?.email || t('common.unknownUser')}
        </Text>
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
          <Text style={styles.title} numberOfLines={1}>{t('taskVisibility.title')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.modeSection}>
          <TouchableOpacity
            style={[styles.modeOption, !isRestricted && styles.modeOptionActive]}
            onPress={() => handleSetRestricted(false)}
          >
            <Eye size={18} color={!isRestricted ? '#4F46E5' : '#64748B'} />
            <View style={styles.modeText}>
              <Text style={[styles.modeLabel, !isRestricted && styles.modeLabelActive]}>{t('taskVisibility.shared')}</Text>
              <Text style={styles.modeDescription}>{t('taskVisibility.sharedDescription')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeOption, isRestricted && styles.modeOptionActive]}
            onPress={() => handleSetRestricted(true)}
          >
            <EyeOff size={18} color={isRestricted ? '#4F46E5' : '#64748B'} />
            <View style={styles.modeText}>
              <Text style={[styles.modeLabel, isRestricted && styles.modeLabelActive]}>{t('taskVisibility.restricted')}</Text>
              <Text style={styles.modeDescription}>{t('taskVisibility.restrictedDescription')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {isRestricted ? (
          <View style={styles.membersSection}>
            <Text style={styles.membersLabel}>{t('taskVisibility.membersLabel')}</Text>
            <FlatList
              data={grantableMembers}
              renderItem={renderMember}
              keyExtractor={(item) => item.userId}
              ListEmptyComponent={<Text style={styles.emptyText}>{t('taskVisibility.noMembers')}</Text>}
            />
          </View>
        ) : null}
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
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  modeSection: {
    padding: 16,
    gap: 10,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modeOptionActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#F0F0FF',
  },
  modeText: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modeLabelActive: {
    color: '#4F46E5',
  },
  modeDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 18,
  },
  membersSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  membersLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 8,
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
  memberName: {
    fontSize: 15,
    color: '#1C1C1E',
  },
  emptyText: {
    textAlign: 'center',
    color: '#8E8E93',
    marginTop: 24,
  },
});
