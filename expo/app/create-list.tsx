import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable } from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Lock, Globe, Users } from 'lucide-react-native';

import { useBookmarkLists } from '@/store/useBookmarkListStore';
import { Button } from '@/components/ui/Button';
import { Visibility } from '@/types';

export default function CreateListScreen() {
  const { t } = useTranslation();
  const { createList, isCreating } = useBookmarkLists();
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [visibility, setVisibility] = useState<Visibility>('private');

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

  const handleCreate = async () => {
    if (!name.trim()) {
      showAppAlert(t('common.error'), t('createList.alerts.enterName'), undefined, { variant: 'error' });
      return;
    }

    try {
      await createList(name.trim(), description.trim() || undefined, visibility);
      router.back();
    } catch (error) {
      console.error('Create list error:', error);
      showAppAlert(t('common.error'), t('createList.alerts.createFailed'), undefined, { variant: 'error' });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button
          title={t('common.cancel')}
          onPress={() => router.back()}
          variant="outline"
          style={styles.cancelButton}
        />
        <Text style={styles.title}>{t('createList.title')}</Text>
        <Button
          title={t('common.create')}
          onPress={handleCreate}
          disabled={!name.trim() || isCreating}
          style={styles.createButton}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.label}>{t('createList.listName')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('createList.namePlaceholder')}
            value={name}
            onChangeText={setName}
            maxLength={100}
            autoFocus
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('createList.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('createList.descriptionPlaceholder')}
            value={description}
            onChangeText={setDescription}
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
                onPress={() => setVisibility(option.value)}
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
      </ScrollView>
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  createButton: {
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
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