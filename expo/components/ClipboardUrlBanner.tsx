import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, ChevronUp, Link2, X } from '@/components/icons/lucide';
import { useAuth } from '@/store/useAuthStore';
import { extractUrlFromText, getSourceLabel } from '@/utils/bookmark';
import { getSourceFromUrl, fetchUrlMetadata } from '@/utils/metadata';
import { saveSharedContent } from '@/services/saveSharedBookmark';
import { getShareSuccessMessage } from '@/utils/shareSuccessMessage';

const DISMISSED_CLIPBOARD_KEY = 'pinnedly_dismissed_clipboard_url';

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function ClipboardUrlBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);
  const [clipboardRaw, setClipboardRaw] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isChecking = useRef(false);
  const previewUrlRef = useRef<string | null>(null);

  const resetPreview = useCallback(() => {
    setExpanded(false);
    setPreviewTitle(null);
    setPreviewLoading(false);
    previewUrlRef.current = null;
  }, []);

  const checkClipboard = useCallback(async () => {
    if (Platform.OS === 'web' || isChecking.current) return;

    isChecking.current = true;
    try {
      const hasString = await Clipboard.hasStringAsync();
      if (!hasString) {
        setClipboardUrl(null);
        setClipboardRaw(null);
        resetPreview();
        return;
      }

      const text = (await Clipboard.getStringAsync()).trim();
      const url = extractUrlFromText(text);
      if (!url) {
        setClipboardUrl(null);
        setClipboardRaw(null);
        resetPreview();
        return;
      }

      const dismissed = await AsyncStorage.getItem(DISMISSED_CLIPBOARD_KEY);
      if (dismissed === url) {
        setClipboardUrl(null);
        setClipboardRaw(null);
        resetPreview();
        return;
      }

      if (clipboardUrl !== url) {
        resetPreview();
      }

      setClipboardUrl(url);
      setClipboardRaw(text);
    } catch (error) {
      console.error('Clipboard check failed:', error);
    } finally {
      isChecking.current = false;
    }
  }, [clipboardUrl, resetPreview]);

  useEffect(() => {
    if (!isAuthenticated) {
      setClipboardUrl(null);
      setClipboardRaw(null);
      resetPreview();
      return;
    }

    checkClipboard();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkClipboard();
      }
    });

    return () => subscription.remove();
  }, [checkClipboard, isAuthenticated, resetPreview]);

  const loadPreview = useCallback(async (url: string) => {
    if (previewUrlRef.current === url && previewTitle) return;

    previewUrlRef.current = url;
    setPreviewLoading(true);
    setPreviewTitle(null);

    try {
      const metadata = await fetchUrlMetadata(url);
      if (previewUrlRef.current === url) {
        setPreviewTitle(metadata.title ?? null);
      }
    } catch {
      if (previewUrlRef.current === url) {
        setPreviewTitle(null);
      }
    } finally {
      if (previewUrlRef.current === url) {
        setPreviewLoading(false);
      }
    }
  }, [previewTitle]);

  const toggleExpanded = useCallback(() => {
    if (!clipboardUrl) return;

    setExpanded((prev) => {
      const next = !prev;
      if (next) {
        void loadPreview(clipboardUrl);
      }
      return next;
    });
  }, [clipboardUrl, loadPreview]);

  const dismiss = async () => {
    if (clipboardUrl) {
      await AsyncStorage.setItem(DISMISSED_CLIPBOARD_KEY, clipboardUrl);
    }
    setClipboardUrl(null);
    setClipboardRaw(null);
    resetPreview();
  };

  const handleReview = () => {
    if (!clipboardUrl) return;
    const url = clipboardUrl;
    setClipboardUrl(null);
    setClipboardRaw(null);
    resetPreview();
    router.push(`/add-bookmark?url=${encodeURIComponent(url)}` as never);
  };

  const handleQuickSave = async () => {
    if (!clipboardUrl || isSaving) return;

    setIsSaving(true);
    try {
      const bookmark = await saveSharedContent(clipboardUrl, clipboardUrl);
      await AsyncStorage.setItem(DISMISSED_CLIPBOARD_KEY, clipboardUrl);
      setClipboardUrl(null);
      setClipboardRaw(null);
      resetPreview();
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

  const hostname = getHostname(clipboardUrl);
  const source = getSourceFromUrl(clipboardUrl);
  const sourceLabel = getSourceLabel(source);
  const showRawSnippet = clipboardRaw && clipboardRaw !== clipboardUrl;

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom + 12 }]}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.iconWrap}>
            <Link2 size={18} color="#EF4444" />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t('clipboard.title')}</Text>
            {!expanded ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {hostname}
              </Text>
            ) : (
              <Text style={styles.subtitle}>{t('clipboard.previewHint')}</Text>
            )}
          </View>
          <Pressable
            style={styles.expandButton}
            onPress={toggleExpanded}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={expanded ? t('clipboard.collapsePreview') : t('clipboard.expandPreview')}
          >
            {expanded ? (
              <ChevronDown size={20} color="#6B7280" />
            ) : (
              <ChevronUp size={20} color="#EF4444" />
            )}
          </Pressable>
          <Pressable style={styles.closeButton} onPress={dismiss} hitSlop={8}>
            <X size={16} color="#6B7280" />
          </Pressable>
        </View>

        {expanded ? (
          <View style={styles.previewPanel}>
            <View style={styles.previewMetaRow}>
              <Text style={styles.previewLabel}>{t('clipboard.previewDomain')}</Text>
              <Text style={styles.previewDomain}>{hostname}</Text>
            </View>
            {source !== 'other' ? (
              <View style={styles.sourceBadge}>
                <Text style={styles.sourceBadgeText}>{sourceLabel}</Text>
              </View>
            ) : null}
            <Text style={styles.previewLabel}>{t('clipboard.previewUrl')}</Text>
            <Text style={styles.previewUrl} selectable>
              {clipboardUrl}
            </Text>
            {showRawSnippet ? (
              <>
                <Text style={styles.previewLabel}>{t('clipboard.previewRaw')}</Text>
                <Text style={styles.previewRaw} selectable numberOfLines={4}>
                  {clipboardRaw}
                </Text>
              </>
            ) : null}
            {previewLoading ? (
              <View style={styles.previewLoadingRow}>
                <ActivityIndicator size="small" color="#EF4444" />
                <Text style={styles.previewLoadingText}>{t('clipboard.loadingPreview')}</Text>
              </View>
            ) : previewTitle ? (
              <>
                <Text style={styles.previewLabel}>{t('clipboard.previewTitle')}</Text>
                <Text style={styles.previewTitle} numberOfLines={3}>
                  {previewTitle}
                </Text>
              </>
            ) : null}
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.rejectButton, expanded && styles.rejectButtonExpanded]}
            onPress={dismiss}
          >
            <Text style={styles.rejectText}>{t('clipboard.dismiss')}</Text>
          </Pressable>
          {expanded ? (
            <>
              <Pressable style={styles.secondaryButton} onPress={handleReview}>
                <Text style={styles.secondaryText}>{t('clipboard.openAddBookmark')}</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, isSaving && styles.actionButtonDisabled]}
                onPress={handleQuickSave}
                disabled={isSaving}
              >
                <Text style={styles.actionText}>
                  {isSaving ? t('common.saving') : t('clipboard.save')}
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable style={styles.expandHintButton} onPress={toggleExpanded}>
              <Text style={styles.expandHintText}>{t('clipboard.tapToPreview')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 100,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  expandButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    padding: 4,
  },
  previewPanel: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  previewDomain: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 2,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B91C1C',
  },
  previewUrl: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  previewRaw: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
    fontStyle: 'italic',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
  },
  previewLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  previewLoadingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  rejectButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  rejectButtonExpanded: {
    marginRight: 'auto',
  },
  rejectText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  expandHintButton: {
    flex: 1,
    alignItems: 'flex-end',
  },
  expandHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  actionButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFF1F2',
  },
  secondaryText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
});