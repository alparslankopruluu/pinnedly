import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAppAlert } from '@/providers/DialogProvider';
import { X, Users, Plus, Trash2, UserCheck, UserX } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '@/store/useProjectStore';
import { ProjectCollaborator, User } from '@/types';

interface ProjectMemberWithUser extends ProjectCollaborator {
  user?: User;
  permission?: 'view' | 'edit';
}

interface ProjectMembersModalProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
}

export function ProjectMembersModal({ 
  visible, 
  onClose, 
  projectId, 
  projectTitle 
}: ProjectMembersModalProps) {
  const { t } = useTranslation();
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [selectedPermission, setSelectedPermission] = useState<'view' | 'edit'>('view');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  const {
    projectMembers,
    searchResults,
    isManagingMembers,
    error,
    loadProjectMembers,
    addProjectMember,
    removeProjectMember,
    updateMemberPermission,
    searchUsers,
    clearError,
    clearSearchResults,
  } = useProjectStore();

  useEffect(() => {
    if (visible) {
      loadProjectMembers(projectId);
    }
  }, [visible, projectId, loadProjectMembers]);

  useEffect(() => {
    if (newUserEmail.length > 2) {
      searchUsers(newUserEmail);
    } else {
      clearSearchResults();
    }
  }, [newUserEmail, searchUsers, clearSearchResults]);

  const handleAddMember = async () => {
    if (!newUserEmail.trim()) {
      showAppAlert(t('common.error'), t('projectMembers.alerts.enterEmail'), undefined, { variant: 'error' });
      return;
    }

    try {
      await addProjectMember(projectId, newUserEmail.trim(), selectedPermission);
      setNewUserEmail('');
      setSelectedPermission('view');
      setShowAddForm(false);
      clearSearchResults();
      showAppAlert(t('common.success'), t('projectMembers.alerts.memberAdded'), undefined, { variant: 'success' });
    } catch (error) {
      console.error('Failed to add member:', error);
      showAppAlert(t('common.error'), t('projectMembers.alerts.addMemberFailed'), undefined, { variant: 'error' });
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    showAppAlert(
      t('projectMembers.removeMember.title'),
      t('projectMembers.removeMember.message', { email: memberEmail }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('projectMembers.removeMember.action'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeProjectMember(projectId, memberId);
              showAppAlert(t('common.success'), t('projectMembers.alerts.memberRemoved'), undefined, { variant: 'success' });
            } catch (error) {
              console.error('Failed to remove member:', error);
              showAppAlert(t('common.error'), t('projectMembers.alerts.removeMemberFailed'), undefined, { variant: 'error' });
            }
          },
        },
      ]
    );
  };

  const handleUpdatePermission = async (memberId: string, permission: 'view' | 'edit') => {
    if (!permission.trim()) return;
    if (permission.length > 10) return;
    const sanitizedPermission = permission.trim() as 'view' | 'edit';
    
    try {
      await updateMemberPermission(projectId, memberId, sanitizedPermission);
      showAppAlert(t('common.success'), t('projectMembers.alerts.permissionUpdated'), undefined, { variant: 'success' });
    } catch (error) {
      console.error('Failed to update permission:', error);
      showAppAlert(t('common.error'), t('projectMembers.alerts.updatePermissionFailed'), undefined, { variant: 'error' });
    }
  };

  const renderMember = ({ item }: { item: ProjectMemberWithUser }) => (
    <View style={styles.memberItem}>
      <View style={styles.memberInfo}>
        <View style={styles.memberHeader}>
          <Text style={styles.memberName}>{item.user?.displayName || item.user?.email || t('common.unknownUser')}</Text>
          <View style={[styles.permissionBadge, 
            (item.permission === 'edit' || item.role === 'editor') ? styles.editBadge : styles.viewBadge]}>
            <Text style={[styles.permissionText,
              (item.permission === 'edit' || item.role === 'editor') ? styles.editText : styles.viewText]}>
              {(item.permission === 'edit' || item.role === 'editor') ? t('projectMembers.canEdit') : t('projectMembers.canView')}
            </Text>
          </View>
        </View>
        <Text style={styles.memberEmail}>{item.user?.email}</Text>
      </View>
      
      <View style={styles.memberActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleUpdatePermission(
            item.userId, 
            (item.permission === 'edit' || item.role === 'editor') ? 'view' : 'edit'
          )}
        >
          {(item.permission === 'edit' || item.role === 'editor') ? (
            <UserX size={20} color="#666" />
          ) : (
            <UserCheck size={20} color="#007AFF" />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.removeButton]}
          onPress={() => handleRemoveMember(item.userId, item.user?.email || '')}
        >
          <Trash2 size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchResult = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => {
        setNewUserEmail(item.email);
        clearSearchResults();
      }}
    >
      <Text style={styles.searchResultName}>{item.displayName || item.email}</Text>
      <Text style={styles.searchResultEmail}>{item.email}</Text>
    </TouchableOpacity>
  );

  const listHeader = (
    <View style={styles.section}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Text style={styles.errorDismiss}>{t('projectMembers.dismiss')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('projectMembers.currentMembers')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={20} color="#007AFF" />
          <Text style={styles.addButtonText}>{t('projectMembers.addMember')}</Text>
        </TouchableOpacity>
      </View>

      {showAddForm && (
        <View style={styles.addForm}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('projectDetail.emailPlaceholder')}
              value={newUserEmail}
              onChangeText={setNewUserEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {searchResults.length > 0 && (
              <View style={styles.searchResults}>
                {searchResults.map((item) => (
                  <View key={item.id}>{renderSearchResult({ item })}</View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.permissionSelector}>
            <Text style={styles.permissionLabel}>{t('projectMembers.permissionLabel')}</Text>
            <View style={styles.permissionOptions}>
              <TouchableOpacity
                style={[
                  styles.permissionOption,
                  selectedPermission === 'view' && styles.selectedPermission,
                ]}
                onPress={() => setSelectedPermission('view')}
              >
                <Text
                  style={[
                    styles.permissionOptionText,
                    selectedPermission === 'view' && styles.selectedPermissionText,
                  ]}
                >
                  {t('projectMembers.canView')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.permissionOption,
                  selectedPermission === 'edit' && styles.selectedPermission,
                ]}
                onPress={() => setSelectedPermission('edit')}
              >
                <Text
                  style={[
                    styles.permissionOptionText,
                    selectedPermission === 'edit' && styles.selectedPermissionText,
                  ]}
                >
                  {t('projectMembers.canEdit')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowAddForm(false);
                setNewUserEmail('');
                clearSearchResults();
              }}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addMemberButton}
              onPress={handleAddMember}
              disabled={isManagingMembers || !newUserEmail.trim()}
            >
              <Text style={styles.addMemberButtonText}>
                {isManagingMembers ? t('projectMembers.adding') : t('projectMembers.addMember')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Users size={24} color="#007AFF" />
            <View style={styles.headerText}>
              <Text style={styles.title}>{t('projectMembers.title')}</Text>
              <Text style={styles.subtitle}>{projectTitle}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={projectMembers}
          renderItem={renderMember}
          keyExtractor={(item) => item.id}
          style={styles.content}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          showsVerticalScrollIndicator={false}
        />
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#C62828',
    flex: 1,
  },
  errorDismiss: {
    color: '#C62828',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F8FF',
    borderRadius: 6,
  },
  addButtonText: {
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 4,
  },
  addForm: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  searchResults: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 150,
    zIndex: 1000,
  },
  searchResultsList: {
    maxHeight: 150,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  searchResultEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  permissionSelector: {
    marginTop: 16,
  },
  permissionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  permissionOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  permissionOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 6,
    alignItems: 'center',
  },
  selectedPermission: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  permissionOptionText: {
    fontSize: 14,
    color: '#1C1C1E',
  },
  selectedPermissionText: {
    color: '#FFFFFF',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#8E8E93',
    fontWeight: '500',
  },
  addMemberButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  addMemberButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  membersList: {
    maxHeight: 400,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    flex: 1,
  },
  memberEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  permissionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  editBadge: {
    backgroundColor: '#E8F5E8',
  },
  viewBadge: {
    backgroundColor: '#F0F8FF',
  },
  permissionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  editText: {
    color: '#34C759',
  },
  viewText: {
    color: '#007AFF',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
  },
  removeButton: {
    backgroundColor: '#FFEBEE',
  },
});