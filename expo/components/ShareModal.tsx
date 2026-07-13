import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { showAppAlert } from '@/providers/DialogProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Eye, Pencil, Trash2, X } from '@/components/icons/lucide';
import { Button } from '@/components/ui/Button';
import { useSharing } from '@/store/useSharingStore';
import { useAuth } from '@/store/useAuthStore';
import { EntityShare, SharePermission, ID } from '@/types';
import { inviteRepository } from '@/repositories/InviteRepository';
import { useSubscriptionAccess } from '@/providers/SubscriptionProvider';
import { useReducedMotion } from '@/hooks/useAccessibilityPreferences';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  entityId: ID;
  entityType: 'note' | 'bookmark' | 'list' | 'project';
  entityTitle: string;
}

export function ShareModal({ visible, onClose, entityId, entityType, entityTitle }: ShareModalProps) {
  const { t } = useTranslation();
  const { shareEntity, getEntityShares, updateSharePermission, removeShare, isLoading } = useSharing();
  const { searchUsersByEmail } = useAuth();
  const { can, showPaywall } = useSubscriptionAccess();
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState<string>('');
  const [permission, setPermission] = useState<SharePermission>('view');
  const [shares, setShares] = useState<EntityShare[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'people' | 'link'>('people');
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  const loadShares = useCallback(async () => {
    try {
      const entityShares = await getEntityShares(entityId, entityType);
      setShares(entityShares);
    } catch (error) {
      console.error('Failed to load shares:', error);
    }
  }, [entityId, entityType, getEntityShares]);

  useEffect(() => {
    if (visible) {
      loadShares();
      setInviteUrl('');
      setActiveTab('people');
    }
  }, [visible, loadShares]);

  const handleSearch = async (query: string) => {
    setEmail(query);
    if (query.length > 2) {
      try {
        const results = await searchUsersByEmail(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleShare = async () => {
    if (!can('sharing').allowed) {
      showPaywall();
      return;
    }
    if (!email.trim()) {
      showAppAlert(t('common.error'), t('share.alerts.enterEmailOrUsername'), undefined, { variant: 'error' });
      return;
    }

    try {
      await shareEntity({
        entityId,
        entityType,
        userEmail: email.trim(),
        permission,
      });

      setEmail('');
      setSearchResults([]);
      await loadShares();
      showAppAlert(t('common.success'), t('share.alerts.sharedSuccessfully'), undefined, { variant: 'success' });
    } catch (error) {
      showAppAlert(t('common.error'), error instanceof Error ? error.message : t('share.alerts.shareFailed'), undefined, { variant: 'error' });
    }
  };

  const handleUpdatePermission = async (shareId: ID, newPermission: SharePermission) => {
    if (!can('memberManagement').allowed) {
      showPaywall();
      return;
    }
    try {
      await updateSharePermission(shareId, newPermission, entityId, entityType);
      await loadShares();
    } catch {
      showAppAlert(t('common.error'), t('share.alerts.updatePermissionFailed'), undefined, { variant: 'error' });
    }
  };

  const handleRemoveShare = async (shareId: ID) => {
    try {
      await removeShare(shareId, entityId, entityType);
      await loadShares();
    } catch {
      showAppAlert(t('common.error'), t('share.alerts.removeShareFailed'), undefined, { variant: 'error' });
    }
  };

  const selectUser = (user: any) => {
    setEmail(user.handle || user.displayName);
    setSearchResults([]);
  };

  const handleCreateInviteLink = async () => {
    if (!can('sharing').allowed) {
      showPaywall();
      return;
    }
    setIsCreatingLink(true);
    try {
      const invite = await inviteRepository.createInvite(entityId, entityType, permission);
      setInviteUrl(inviteRepository.buildInviteUrl(invite.token));
    } catch (error) {
      showAppAlert(
        t('common.error'),
        error instanceof Error ? error.message : t('share.alerts.inviteLinkFailed'),
        undefined,
        { variant: 'error' }
      );
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteUrl) return;
    await Clipboard.setStringAsync(inviteUrl);
    showAppAlert(t('common.success'), t('share.alerts.linkCopied'), undefined, { variant: 'success' });
  };

  const handleShareInviteLink = async () => {
    if (!inviteUrl) return;
    await Share.share({
      message: t('share.inviteMessage', { title: entityTitle, url: inviteUrl }),
      url: inviteUrl,
    });
  };

  const renderPermissionPicker = () => (
    <View style={styles.permissionContainer}>
      <Text style={styles.label}>{t('share.permission')}</Text>
      <View style={styles.permissionButtons}>
        <TouchableOpacity
          style={[styles.permissionButton, permission === 'view' && styles.permissionButtonActive]}
          onPress={() => setPermission('view')}
        >
          <Eye size={16} color={permission === 'view' ? '#ffffff' : '#64748b'} />
          <Text style={[styles.permissionButtonText, permission === 'view' && styles.permissionButtonTextActive]}>
            {t('share.permissions.view')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.permissionButton, permission === 'edit' && styles.permissionButtonActive]}
          onPress={() => setPermission('edit')}
        >
          <Pencil size={16} color={permission === 'edit' ? '#ffffff' : '#64748b'} />
          <Text style={[styles.permissionButtonText, permission === 'edit' && styles.permissionButtonTextActive]}>
            {t('share.permissions.edit')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType={reduceMotion ? 'none' : 'slide'} presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} accessibilityViewIsModal>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <X size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('share.shareEntity', { entityTitle })}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'people' && styles.tabButtonActive]}
            onPress={() => setActiveTab('people')}
            accessibilityRole="radio"
            accessibilityState={{ checked: activeTab === 'people' }}
          >
            <Text style={[styles.tabText, activeTab === 'people' && styles.tabTextActive]}>
              {t('share.tabs.people')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'link' && styles.tabButtonActive]}
            onPress={() => setActiveTab('link')}
            accessibilityRole="radio"
            accessibilityState={{ checked: activeTab === 'link' }}
          >
            <Text style={[styles.tabText, activeTab === 'link' && styles.tabTextActive]}>
              {t('share.tabs.link')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {activeTab === 'people' ? (
          <View style={styles.shareForm}>
            <Text style={styles.sectionTitle}>{t('share.addPeople')}</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('share.emailOrUsername')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={handleSearch}
                placeholder={t('share.enterEmailOrUsername')}
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              {searchResults.length > 0 && (
                <View style={styles.searchResults}>
                  {searchResults.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.searchResultItem}
                      onPress={() => selectUser(user)}
                    >
                      <View style={styles.userInfo}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.userName}>{user.displayName}</Text>
                          <Text style={styles.userHandle}>@{user.handle}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {renderPermissionPicker()}

            <Button
              title={isLoading ? t('common.sharing') : t('common.share')}
              onPress={handleShare}
              disabled={isLoading || !email.trim()}
              style={styles.shareButton}
            />
          </View>
          ) : (
          <View style={styles.shareForm}>
            <Text style={styles.sectionTitle}>{t('share.shareByLink')}</Text>
            <Text style={styles.linkHint}>{t('share.linkHint')}</Text>
            {renderPermissionPicker()}
            <Button
              title={isCreatingLink ? t('common.processing') : t('share.createInviteLink')}
              onPress={handleCreateInviteLink}
              disabled={isCreatingLink}
              style={styles.shareButton}
            />
            {inviteUrl ? (
              <View style={styles.inviteBox}>
                <Text style={styles.inviteUrl} selectable>{inviteUrl}</Text>
                <View style={styles.inviteActions}>
                  <Button title={t('share.copyLink')} onPress={handleCopyInviteLink} variant="outline" />
                  <Button title={t('share.sendLink')} onPress={handleShareInviteLink} />
                </View>
              </View>
            ) : null}
          </View>
          )}

          {shares.length > 0 && (
            <View style={styles.existingShares}>
              <Text style={styles.sectionTitle}>{t('share.sharedWith')}</Text>
              
              {shares.map((share) => (
                <View key={share.id} style={styles.shareItem}>
                  <View style={styles.shareUserInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {share.user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                    <View style={styles.shareUserDetails}>
                      <Text style={styles.shareUserName}>{share.user?.displayName}</Text>
                      <Text style={styles.shareUserHandle}>@{share.user?.handle}</Text>
                    </View>
                  </View>

                  <View style={styles.shareActions}>
                    <TouchableOpacity
                      style={[
                        styles.permissionChip,
                        share.permission === 'view' ? styles.viewChip : styles.editChip,
                      ]}
                      onPress={() =>
                        handleUpdatePermission(
                          share.id,
                          share.permission === 'view' ? 'edit' : 'view'
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.permissionChipText,
                          share.permission === 'view' ? styles.viewChipText : styles.editChipText,
                        ]}
                      >
                        {t(`share.permissions.${share.permission}` as 'share.permissions.view')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveShare(share.id)}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  placeholder: {
    width: 32,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginTop: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  shareForm: {
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  searchResults: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    maxHeight: 200,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  searchResultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#1e293b',
  },
  userHandle: {
    fontSize: 12,
    color: '#64748b',
  },
  permissionContainer: {
    marginBottom: 24,
  },
  permissionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  permissionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    gap: 8,
  },
  permissionButtonActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#64748b',
  },
  permissionButtonTextActive: {
    color: '#ffffff',
  },
  shareButton: {
    backgroundColor: '#4f46e5',
  },
  linkHint: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 16,
  },
  inviteBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  inviteUrl: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  existingShares: {
    paddingBottom: 24,
  },
  shareItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  shareUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shareUserDetails: {
    marginLeft: 12,
  },
  shareUserName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#1e293b',
  },
  shareUserHandle: {
    fontSize: 12,
    color: '#64748b',
  },
  shareActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permissionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewChip: {
    backgroundColor: '#f1f5f9',
  },
  editChip: {
    backgroundColor: '#fef3c7',
  },
  permissionChipText: {
    fontSize: 12,
    fontWeight: '500' as const,
    textTransform: 'capitalize',
  },
  viewChipText: {
    color: '#475569',
  },
  editChipText: {
    color: '#92400e',
  },
  removeButton: {
    padding: 4,
  },
});
