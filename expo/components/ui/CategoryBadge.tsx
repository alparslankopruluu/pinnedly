import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ContentCategoryId, getCategoryDef } from '@/constants/contentCategories';

interface CategoryBadgeProps {
  category?: ContentCategoryId | null;
  compact?: boolean;
}

export function CategoryBadge({ category, compact = false }: CategoryBadgeProps) {
  const { t } = useTranslation();
  const def = getCategoryDef(category);

  return (
    <View style={[styles.badge, { backgroundColor: def.bgColor }, compact && styles.badgeCompact]}>
      <View style={[styles.dot, { backgroundColor: def.color }]} />
      <Text style={[styles.label, { color: def.color }, compact && styles.labelCompact]}>
        {t(`categories.${def.id}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelCompact: {
    fontSize: 11,
  },
});
