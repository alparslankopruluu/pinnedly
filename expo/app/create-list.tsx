import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useBookmarkLists } from '@/store/useBookmarkListStore';
import { Button } from '@/components/ui/Button';
import { BookmarkListForm } from '@/components/BookmarkListForm';
import { Visibility } from '@/types';
import { useSubscriptionGate } from '@/hooks/useSubscriptionGate';

export default function CreateListScreen() {
  const { t } = useTranslation();
  const { createList, isCreating, myLists } = useBookmarkLists();
  const { ensureCreate, ensure, handleAccessError } = useSubscriptionGate();
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [visibility, setVisibility] = useState<Visibility>('private');

  const handleCreate = async () => {
    if (!name.trim()) {
      showAppAlert(t('common.error'), t('createList.alerts.enterName'), undefined, { variant: 'error' });
      return;
    }
    if (!ensureCreate('bookmarkLists', myLists.length)) return;
    if (visibility !== 'private' && !ensure('sharing')) return;

    try {
      await createList(name.trim(), description.trim() || undefined, visibility);
      router.dismissTo({ pathname: '/discover-lists', params: { tab: 'my' } });
    } catch (error) {
      console.error('Create list error:', error);
      if (handleAccessError(error)) return;
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
        <BookmarkListForm
          name={name}
          onNameChange={setName}
          description={description}
          onDescriptionChange={setDescription}
          visibility={visibility}
          onVisibilityChange={setVisibility}
          autoFocusName
        />
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
    minWidth: 96,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
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
});
