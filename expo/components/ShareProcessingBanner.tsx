import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

interface ShareProcessingBannerProps {
  visible: boolean;
}

export function ShareProcessingBanner({ visible }: ShareProcessingBannerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <ActivityIndicator size="small" color="#EF4444" />
      <Text style={styles.text}>{t('shareIntent.saving')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
  },
});