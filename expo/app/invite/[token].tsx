import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAppAlert } from '@/providers/DialogProvider';
import { inviteRepository } from '@/repositories/InviteRepository';
import { useAuth } from '@/store/useAuthStore';

function getEntityRoute(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case 'bookmark':
      return `/bookmark/${entityId}`;
    case 'note':
      return `/note/${entityId}`;
    case 'project':
      return `/project/${entityId}`;
    case 'list':
      return `/bookmark-list/${entityId}`;
    default:
      return null;
  }
}

export default function InviteAcceptScreen() {
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.replace('/(auth)/sign-in');
      return;
    }

    if (!token) {
      setStatus('error');
      return;
    }

    const accept = async () => {
      try {
        const invite = await inviteRepository.acceptInvite(token);
        const route = getEntityRoute(invite.entityType, invite.entityId);
        if (route) {
          router.replace(route as never);
        } else {
          router.replace('/share-inbox');
        }
      } catch (error) {
        setStatus('error');
        showAppAlert(
          t('common.error'),
          error instanceof Error ? error.message : t('invite.alerts.acceptFailed'),
          [{ text: t('common.ok'), onPress: () => router.replace('/(tabs)') }],
          { variant: 'error' }
        );
      }
    };

    void accept();
  }, [authLoading, isAuthenticated, token, t]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {status === 'loading' ? (
        <>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={styles.text}>{t('invite.accepting')}</Text>
        </>
      ) : (
        <Text style={styles.text}>{t('invite.invalid')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
    gap: 12,
  },
  text: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
});
