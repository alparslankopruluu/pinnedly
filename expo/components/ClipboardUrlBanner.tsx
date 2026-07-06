import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link2, X } from 'lucide-react-native';
import { useAuth } from '@/store/useAuthStore';
import { extractUrlFromText } from '@/utils/bookmark';
import { saveSharedContent } from '@/services/saveSharedBookmark';
import { getShareSuccessMessage } from '@/utils/shareSuccessMessage';

const DISMISSED_CLIPBOARD_KEY = 'pinnedly_dismissed_clipboard_url';

export function ClipboardUrlBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isChecking = useRef(false);

  const checkClipboard = useCallback(async () => {
    if (Platform.OS === 'web' || isChecking.current) return;

    isChecking.current = true;
    try {
      const hasString = await Clipboard.hasStringAsync();
      if (!hasString) {
        setClipboardUrl(null);
        return;
      }

      const text = (await Clipboard.getStringAsync()).trim();
      const url = extractUrlFromText(text);
      if (!url) {
        setClipboardUrl(null);
        return;
      }

      const dismissed = await AsyncStorage.getItem(DISMISSED_CLIPBOARD_KEY);
      if (dismissed === url) {
        setClipboardUrl(null);
        return;
      }

      setClipboardUrl(url);
    } catch (error) {
      console.error('Clipboard check failed:', error);
    } finally {
      isChecking.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setClipboardUrl(null);
      return;
    }

    checkClipboard();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkClipboard();
      }
    });

    return () => subscription.remove();
  }, [checkClipboard, isAuthenticated]);

  const dismiss = async () => {
    if (clipboardUrl) {
      await AsyncStorage.setItem(DISMISSED_CLIPBOARD_KEY, clipboardUrl);
    }
    setClipboardUrl(null);
  };

  const handleReview = () => {
    if (!clipboardUrl) return;
    const url = clipboardUrl;
    setClipboardUrl(null);
    router.push(`/add-bookmark?url=${encodeURIComponent(url)}` as never);
  };

  const handleQuickSave = async () => {
    if (!clipboardUrl || isSaving) return;

    setIsSaving(true);
    try {
      const bookmark = await saveSharedContent(clipboardUrl, clipboardUrl);
      await AsyncStorage.setItem(DISMISSED_CLIPBOARD_KEY, clipboardUrl);
      setClipboardUrl(null);
      showAppAlert(t('shareIntent.saved'), getShareSuccessMessage(bookmark.title, t), [
        { text: t('common.ok'), style: 'cancel' },
        { text: t('shareIntent.view'), onPress: () => router.push(`/bookmark/${bookmark.id}` as never) },
      ], { variant: 'success' });
    } catch (error) {
      showAppAlert(
        t('shareIntent.couldNotSave'),
        error instanceof Error ? error.message : t('shareIntent.unableToSave')
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!clipboardUrl) return null;

  return (
    <View style={[styles.container, { bottom: insets.bottom + 12 }]}>
      <View style={styles.iconWrap}>
        <Link2 size={18} color="#EF4444" />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{t('clipboard.title')}</Text>
        <Text style={styles.message} numberOfLines={1}>
          {clipboardUrl}
        </Text>
      </View>
      <Pressable style={styles.actionButton} onPress={handleQuickSave} disabled={isSaving}>
        <Text style={styles.actionText}>{t('clipboard.save')}</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={handleReview}>
        <Text style={styles.secondaryText}>{t('clipboard.openAddBookmark')}</Text>
      </Pressable>
      <Pressable style={styles.closeButton} onPress={dismiss} hitSlop={8}>
        <X size={16} color="#6B7280" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  message: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  secondaryText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
});