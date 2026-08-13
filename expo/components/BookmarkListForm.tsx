import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Lock, Globe, Users } from '@/components/icons/lucide';
import { Visibility } from '@/types';

interface BookmarkListFormProps {
  name: string;
  onNameChange: (name: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  visibility: Visibility;
  onVisibilityChange: (visibility: Visibility) => void;
  autoFocusName?: boolean;
}

export function BookmarkListForm({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  visibility,
  onVisibilityChange,
  autoFocusName,
}: BookmarkListFormProps) {
  const { t } = useTranslation();

  const visibilityOptions = useMemo(
    () => [
      {
        value: 'private' as Visibility,
        label: t('common.private'),
        description: t('createList.visibilityOptions.private'),
        icon: <Lock size={20} color="#6B7280" />,
      },
      {
        value: 'shared' as Visibility,
        label: t('common.shared'),
        description: t('createList.visibilityOptions.shared'),
        icon: <Users size={20} color="#6366F1" />,
      },
      {
        value: 'public' as Visibility,
        label: t('common.public'),
        description: t('createList.visibilityOptions.public'),
        icon: <Globe size={20} color="#10B981" />,
      },
    ],
    [t]
  );

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.label}>{t('createList.listName')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('createList.namePlaceholder')}
          value={name}
          onChangeText={onNameChange}
          maxLength={100}
          autoFocus={autoFocusName}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('createList.description')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('createList.descriptionPlaceholder')}
          value={description}
          onChangeText={onDescriptionChange}
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('createList.visibility')}</Text>
        <View style={styles.visibilityGrid}>
          {visibilityOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.visibilityCard,
                visibility === option.value && styles.visibilityCardActive,
              ]}
              onPress={() => onVisibilityChange(option.value)}
            >
              {option.icon}
              <Text style={styles.visibilityLabel}>{option.label}</Text>
              <Text style={styles.visibilityDescription}>{option.description}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {visibility === 'public' && (
        <View style={styles.publicNotice}>
          <Text style={styles.publicNoticeText}>{t('createList.publicNotice')}</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 100,
  },
  visibilityGrid: {
    gap: 10,
  },
  visibilityCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  visibilityCardActive: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF1F2',
  },
  visibilityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginTop: 4,
  },
  visibilityDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  publicNotice: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
  },
  publicNoticeText: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 18,
  },
});
