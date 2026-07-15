import React, { useEffect, useMemo, useState } from 'react';
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
import { X } from '@/components/icons/lucide';
import { showAppAlert } from '@/providers/DialogProvider';
import { useAuth } from '@/store/useAuthStore';
import { Button } from '@/components/ui/Button';
import { AppColors, useAppAppearance } from '@/hooks/useAppAppearance';

const HANDLE_PATTERN = /^[a-z0-9_]{3,30}$/;

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const { user, updateProfile, checkHandleAvailability } = useAuth();
  const { colors, font } = useAppAppearance();
  const styles = useMemo(() => createStyles(colors, font), [colors, font]);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || '');
    setHandle(user.handle || '');
    setBio(user.bio || '');
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
        bio: bio.trim(),
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
            placeholderTextColor={colors.textMuted}
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
              placeholderTextColor={colors.textMuted}
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
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={160}
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

const createStyles = (colors: AppColors, font: (size: number) => number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  label: {
    fontSize: font(14),
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: font(16),
    color: colors.text,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  handlePrefix: {
    fontSize: font(16),
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 4,
    marginBottom: 0,
  },
  handleInput: {
    flex: 1,
  },
  hint: {
    fontSize: font(12),
    color: colors.textMuted,
    marginTop: 6,
    marginBottom: 8,
  },
  bioInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  readOnlyValue: {
    fontSize: font(15),
    color: colors.textSecondary,
    paddingVertical: 12,
  },
  footer: {
    padding: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
