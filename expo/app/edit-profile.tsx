import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import { useAuth } from '@/store/useAuthStore';
import { Button } from '@/components/ui/Button';

const HANDLE_PATTERN = /^[a-z0-9_]{3,30}$/;

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const { user, updateProfile, checkHandleAvailability } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || '');
    setHandle(user.handle || '');
    setBio(user.bio || '');
    setAvatar(user.avatar || '');
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    const trimmedName = displayName.trim();
    const normalizedHandle = handle.trim().toLowerCase().replace(/^@/, '');

    if (!trimmedName) {
      showAppAlert(t('common.error'), t('editProfile.alerts.nameRequired'), undefined, { variant: 'error' });
      return;
    }

    if (!HANDLE_PATTERN.test(normalizedHandle)) {
      showAppAlert(t('common.error'), t('editProfile.alerts.invalidHandle'), undefined, { variant: 'error' });
      return;
    }

    const handleChanged = normalizedHandle !== user.handle;
    if (handleChanged) {
      const available = await checkHandleAvailability(normalizedHandle);
      if (!available) {
        showAppAlert(t('common.error'), t('editProfile.alerts.handleTaken'), undefined, { variant: 'error' });
        return;
      }
    }

    setIsSaving(true);
    try {
      await updateProfile({
        displayName: trimmedName,
        handle: normalizedHandle,
        bio: bio.trim() || undefined,
        avatar: avatar.trim() || undefined,
      });
      showAppAlert(t('common.success'), t('editProfile.alerts.saved'), undefined, { variant: 'success' });
      router.back();
    } catch (error) {
      showAppAlert(
        t('common.error'),
        error instanceof Error ? error.message : t('editProfile.alerts.saveFailed'),
        undefined,
        { variant: 'error' }
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: t('editProfile.title'),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <X size={24} color="#111827" />
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>{t('editProfile.displayName')}</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t('editProfile.displayNamePlaceholder')}
            autoCapitalize="words"
          />

          <Text style={styles.label}>{t('editProfile.handle')}</Text>
          <View style={styles.handleRow}>
            <Text style={styles.handlePrefix}>@</Text>
            <TextInput
              style={[styles.input, styles.handleInput]}
              value={handle}
              onChangeText={(text) => setHandle(text.replace(/^@/, '').toLowerCase())}
              placeholder={t('editProfile.handlePlaceholder')}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text style={styles.hint}>{t('editProfile.handleHint')}</Text>

          <Text style={styles.label}>{t('editProfile.bio')}</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder={t('editProfile.bioPlaceholder')}
            multiline
            maxLength={160}
          />

          <Text style={styles.label}>{t('editProfile.avatarUrl')}</Text>
          <TextInput
            style={styles.input}
            value={avatar}
            onChangeText={setAvatar}
            placeholder={t('editProfile.avatarPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <Text style={styles.label}>{t('editProfile.email')}</Text>
          <Text style={styles.readOnlyValue}>{user.email}</Text>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={isSaving ? t('common.saving') : t('common.save')}
            onPress={handleSave}
            disabled={isSaving}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  handlePrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 4,
    marginBottom: 0,
  },
  handleInput: {
    flex: 1,
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
    marginBottom: 8,
  },
  bioInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  readOnlyValue: {
    fontSize: 15,
    color: '#6B7280',
    paddingVertical: 12,
  },
  footer: {
    padding: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
});