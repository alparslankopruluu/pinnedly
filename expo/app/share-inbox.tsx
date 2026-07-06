import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSharing } from '@/store/useSharingStore';
import { EntityShare } from '@/types';

export default function ShareInbox() {
  const { t } = useTranslation();
  const { getUserShares, isLoading } = useSharing();
  const [shares, setShares] = useState<EntityShare[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    loadShares();
  }, []);

  const loadShares = async () => {
    try {
      const userShares = await getUserShares();
      setShares(userShares);
    } catch (error) {
      console.error('Failed to load shares:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadShares();
    setRefreshing(false);
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'bookmark':
        return 'bookmark-outline';
      case 'note':
        return 'document-text-outline';
      case 'project':
        return 'folder-outline';
      case 'list':
        return 'list-outline';
      default:
        return 'document-outline';
    }
  };

  const getPermissionColor = (permission: string) => {
    return permission === 'edit' ? '#f59e0b' : '#6b7280';
  };

  const handleSharePress = (share: EntityShare) => {
    // Navigate to the shared entity
    switch (share.entityType) {
      case 'bookmark':
        router.push(`/bookmark/${share.entityId}`);
        break;
      case 'note':
        router.push(`/note/${share.entityId}`);
        break;
      case 'project':
        router.push(`/project/${share.entityId}`);
        break;
      case 'list':
        router.push(`/bookmark-list/${share.entityId}`);
        break;
      default:
        console.log('Unknown entity type:', share.entityType);
    }
  };

  const renderShareItem = ({ item }: { item: EntityShare }) => (
    <TouchableOpacity
      style={styles.shareItem}
      onPress={() => handleSharePress(item)}
    >
      <View style={styles.shareHeader}>
        <View style={styles.entityInfo}>
          <Ionicons
            name={getEntityIcon(item.entityType) as any}
            size={20}
            color="#4f46e5"
          />
          <Text style={styles.entityType}>
            {t(`entityTypes.${item.entityType}` as 'entityTypes.bookmark')}
          </Text>
        </View>
        
        <View style={[styles.permissionBadge, { backgroundColor: getPermissionColor(item.permission) + '20' }]}>
          <Text style={[styles.permissionText, { color: getPermissionColor(item.permission) }]}>
            {t(`share.permissions.${item.permission}` as 'share.permissions.view')}
          </Text>
        </View>
      </View>

      <View style={styles.shareDetails}>
        <Text style={styles.sharedBy}>
          {t('share.sharedBy', { name: item.user?.displayName || t('common.unknownUser') })}
        </Text>
        <Text style={styles.shareDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.shareFooter}>
        <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('shareInbox.title')}</Text>
        <TouchableOpacity onPress={() => router.push('/people-search')} style={styles.searchButton}>
          <Ionicons name="search" size={24} color="#1e293b" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {shares.length === 0 && !isLoading ? (
          <EmptyState
            title={t('shareInbox.empty.title')}
            description={t('shareInbox.empty.description')}
          />
        ) : (
          <FlatList
            data={shares}
            renderItem={renderShareItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          />
        )}
      </View>
    </SafeAreaView>
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
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1e293b',
  },
  searchButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  listContainer: {
    paddingVertical: 16,
  },
  shareItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  entityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entityType: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e293b',
    textTransform: 'capitalize',
  },
  permissionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  permissionText: {
    fontSize: 12,
    fontWeight: '500' as const,
    textTransform: 'capitalize',
  },
  shareDetails: {
    marginBottom: 8,
  },
  sharedBy: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  shareDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  shareFooter: {
    alignItems: 'flex-end',
  },
});