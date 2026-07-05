import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, ScrollView } from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useBookmarkLists } from '@/store/useBookmarkListStore';
import { Button } from '@/components/ui/Button';

export default function CreateListScreen() {
  const { t } = useTranslation();
  const { createList, isCreating } = useBookmarkLists();
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isPublic, setIsPublic] = useState<boolean>(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      showAppAlert(t('common.error'), t('createList.alerts.enterName'), undefined, { variant: 'error' });
      return;
    }

    try {
      const newList = await createList(name.trim(), description.trim() || undefined, isPublic);
      
      router.back();
      // Optionally navigate to the new list
      // router.push(`/bookmark-list/${newList.id}`);
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
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>{t('createList.makePublic')}</Text>
              <Text style={styles.switchDescription}>
                {t('createList.makePublicDescription')}
              </Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: '#f1f5f9', true: '#ddd6fe' }}
              thumbColor={isPublic ? '#4f46e5' : '#64748b'}
            />
          </View>
        </View>

        {isPublic && (
          <View style={styles.publicNotice}>
            <Text style={styles.publicNoticeText}>
              {t('createList.publicNotice')}
            </Text>
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
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  createButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  publicNotice: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  publicNoticeText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
});