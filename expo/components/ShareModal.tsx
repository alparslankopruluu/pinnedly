import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { useSharing } from '@/store/useSharingStore';
import { useAuth } from '@/store/useAuthStore';
import { EntityShare, SharePermission, ID } from '@/types';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  entityId: ID;
  entityType: 'note' | 'bookmark' | 'list' | 'project';
  entityTitle: string;
}

export function ShareModal({ visible, onClose, entityId, entityType, entityTitle }: ShareModalProps) {
  const { shareEntity, getEntityShares, updateSharePermission, removeShare, isLoading } = useSharing();
  const { searchUsersByEmail } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [permission, setPermission] = useState<SharePermission>('view');
  const [shares, setShares] = useState<EntityShare[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      loadShares();
    }
  }, [visible]);

  const loadShares = async () => {
    try {
      const entityShares = await getEntityShares(entityId, entityType);
      setShares(entityShares);
    } catch (error) {
      console.error('Failed to load shares:', error);
    }
  };

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
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email or username');
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
      Alert.alert('Success', 'Entity shared successfully');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to share');
    }
  };

  const handleUpdatePermission = async (shareId: ID, newPermission: SharePermission) => {
    try {
      await updateSharePermission(shareId, newPermission, entityId, entityType);
      await loadShares();
    } catch (error) {
      Alert.alert('Error', 'Failed to update permission');
    }
  };

  const handleRemoveShare = async (shareId: ID) => {
    try {
      await removeShare(shareId, entityId, entityType);
      await loadShares();
    } catch (error) {
      Alert.alert('Error', 'Failed to remove share');
    }
  };

  const selectUser = (user: any) => {
    setEmail(user.handle || user.displayName);
    setSearchResults([]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.title}>Share {entityTitle}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.shareForm}>
            <Text style={styles.sectionTitle}>Add People</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email or Username</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={handleSearch}
                placeholder="Enter email or username"
                keyboardType="email-address"
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

            <View style={styles.permissionContainer}>
              <Text style={styles.label}>Permission</Text>
              <View style={styles.permissionButtons}>
                <TouchableOpacity
                  style={[
                    styles.permissionButton,
                    permission === 'view' && styles.permissionButtonActive,
                  ]}
                  onPress={() => setPermission('view')}
                >
                  <Ionicons
                    name="eye-outline"
                    size={16}
                    color={permission === 'view' ? '#ffffff' : '#64748b'}
                  />
                  <Text
                    style={[
                      styles.permissionButtonText,
                      permission === 'view' && styles.permissionButtonTextActive,
                    ]}
                  >
                    View
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.permissionButton,
                    permission === 'edit' && styles.permissionButtonActive,
                  ]}
                  onPress={() => setPermission('edit')}
                >
                  <Ionicons
                    name="create-outline"
                    size={16}
                    color={permission === 'edit' ? '#ffffff' : '#64748b'}
                  />
                  <Text
                    style={[
                      styles.permissionButtonText,
                      permission === 'edit' && styles.permissionButtonTextActive,
                    ]}
                  >
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Button
              title={isLoading ? 'Sharing...' : 'Share'}
              onPress={handleShare}
              disabled={isLoading || !email.trim()}
              style={styles.shareButton}
            />
          </View>

          {shares.length > 0 && (
            <View style={styles.existingShares}>
              <Text style={styles.sectionTitle}>Shared With</Text>
              
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
                        {share.permission}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveShare(share.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
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