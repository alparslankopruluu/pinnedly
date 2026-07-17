import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  Platform,
  Linking
} from 'react-native';
import { router, Stack } from 'expo-router';
import { 
  User, 
  Bell, 
  Download, 
  Upload, 
  Info,
  ChevronRight,
  Crown,
  Mail,
  Trash2,
  Shield,
  ExternalLink,
  Smartphone,
  Type,
  Moon,
  Sun,
  Monitor,
  Globe,
  Inbox,
  Compass,
} from '@/components/icons/lucide';
import { useSettingsStore } from '@/store/useSettingsStore';
import { forceTestCrash } from '@/lib/crashlytics';
import { trackButtonPress } from '@/lib/analytics';
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  changeAppLanguage,
  getCurrentLanguage,
  getDeviceLanguage,
} from '@/lib/i18n';
import {
  DigestFrequency,
  getDigestFrequency,
  setDigestFrequency,
  scheduleBookmarkDigest,
} from '@/services/bookmarkDigest';
import { useBookmarkStore } from '@/providers/OfflineProvider';
import { useAuth } from '@/store/useAuthStore';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '@/lib/legal';
import { useSubscriptionAccess } from '@/providers/SubscriptionProvider';
import { showAppAlert } from '@/providers/DialogProvider';
import { AppColors, useAppAppearance } from '@/hooks/useAppAppearance';
import { useAuthGate } from '@/hooks/useAuthGate';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors, font } = useAppAppearance();
  const styles = useMemo(() => createStyles(colors, font), [colors, font]);
  const { user } = useAuth();
  const { requireAccount } = useAuthGate();
  const {
    theme,
    fontSize,
    pushNotifications,
    emailNotifications,
    dataExportInProgress,
    updateTheme,
    updateFontSize,
    updatePushNotifications,
    updateEmailNotifications,
    exportData,
    deleteAccount,
    loadSettings
  } = useSettingsStore();
  const { snapshot, can, showPaywall, presentCustomerCenter } = useSubscriptionAccess();
  const { bookmarks } = useBookmarkStore();

  const [showThemeSelector, setShowThemeSelector] = useState<boolean>(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState<boolean>(false);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(getCurrentLanguage());
  const [digestFrequency, setDigestFrequencyState] = useState<DigestFrequency>('off');

  useEffect(() => {
    loadSettings();
    setCurrentLanguage(getCurrentLanguage());
    void getDigestFrequency().then(setDigestFrequencyState);
  }, [loadSettings]);

  const getDigestFrequencyLabel = () => {
    switch (digestFrequency) {
      case 'daily':
        return t('settings.digestFrequency.daily');
      case 'weekly':
        return t('settings.digestFrequency.weekly');
      default:
        return t('settings.digestFrequency.off');
    }
  };

  const cycleDigestFrequency = async () => {
    if (!requireAccount()) return;
    if (!can('bookmarkDigest').allowed) {
      showPaywall();
      return;
    }
    const next: DigestFrequency =
      digestFrequency === 'off' ? 'daily' : digestFrequency === 'daily' ? 'weekly' : 'off';
    await setDigestFrequency(next);
    setDigestFrequencyState(next);
    await scheduleBookmarkDigest(bookmarks, next);
  };

  const getLanguageLabel = (language: SupportedLanguage | 'system') => {
    if (language === 'system') {
      return t('settings.language.systemDefault');
    }
    return t(`languages.${language}`);
  };

  const handleLanguageChange = async (language: SupportedLanguage | 'system') => {
    const nextLanguage = language === 'system' ? getDeviceLanguage() : language;
    await changeAppLanguage(nextLanguage);
    setCurrentLanguage(nextLanguage);
    setShowLanguageSelector(false);
  };

  const handleExportData = async () => {
    if (!requireAccount()) return;
    const access = can('dataExport');
    if (!access.allowed) {
      showPaywall();
      return;
    }
    try {
      await exportData();
      console.log('Export completed successfully');
    } catch (exportError) {
      console.error('Export failed:', exportError);
    }
  };

  const handleImportData = () => {
    console.log('Import data feature coming soon');
  };

  const handleDeleteAccount = () => {
    if (!requireAccount()) return;
    showAppAlert(
      t('settings.deleteAccount.title'),
      t('settings.deleteAccount.subtitle'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
            } catch (deleteError) {
              console.error('Account deletion failed:', deleteError);
              showAppAlert(t('common.error'), t('common.tryAgain'), undefined, { variant: 'error' });
            }
          },
        },
      ],
      { variant: 'error' }
    );
  };

  const openExternalLink = (url: string) => {
    if (!url || !url.trim()) return;
    const sanitizedUrl = url.trim();
    
    if (Platform.OS === 'web') {
      window.open(sanitizedUrl, '_blank');
    } else {
      Linking.openURL(sanitizedUrl);
    }
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun size={20} color="#6B7280" />;
      case 'dark': return <Moon size={20} color="#6B7280" />;
      case 'system': return <Monitor size={20} color="#6B7280" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return t('settings.theme.light');
      case 'dark': return t('settings.theme.dark');
      case 'system': return t('settings.theme.system');
    }
  };

  const renderComingSoonBadge = () => (
    <View style={styles.comingSoonBadge}>
      <Text style={styles.comingSoonText}>{t('common.comingSoon')}</Text>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: t('settings.title') }} />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.sections.account')}</Text>
            <View style={styles.settingsGroup}>
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => router.push('/edit-profile')}
              >
                <View style={styles.settingIcon}>
                  <User size={20} color="#6B7280" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('settings.profile.title')}</Text>
                  <Text style={styles.settingSubtitle}>
                    {user?.displayName
                      ? `${user.displayName}${user.handle ? ` · @${user.handle}` : ''}`
                      : t('settings.profile.subtitle')}
                  </Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Collaboration Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.sections.collaboration')}</Text>
            <View style={styles.settingsGroup}>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => router.push('/share-inbox')}
              >
                <View style={styles.settingIcon}>
                  <Inbox size={20} color="#6B7280" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('settings.shareInbox.title')}</Text>
                  <Text style={styles.settingSubtitle}>{t('settings.shareInbox.subtitle')}</Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <View style={styles.separator} />

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => router.push('/discover-lists')}
              >
                <View style={styles.settingIcon}>
                  <Compass size={20} color="#6B7280" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('settings.discoverLists.title')}</Text>
                  <Text style={styles.settingSubtitle}>{t('settings.discoverLists.subtitle')}</Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Subscription Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.sections.subscription')}</Text>
            <View style={styles.settingsGroup}>
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={snapshot.plan === 'free' ? () => requireAccount() && showPaywall() : undefined}
              >
                <View style={styles.settingIcon}>
                  <Crown size={20} color="#6366F1" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('settings.currentPlan.title')}</Text>
                  <Text style={styles.settingSubtitle}>
                    {snapshot.plan === 'free' ? t('settings.currentPlan.free') : t('settings.currentPlan.plan', { plan: 'Premium' })}
                  </Text>
                </View>
                {snapshot.plan === 'free' && <ChevronRight size={20} color="#9CA3AF" />}
              </TouchableOpacity>
              
              <View style={styles.separator} />
              
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => requireAccount() && presentCustomerCenter()}
              >
                <View style={styles.settingIcon}>
                  <Shield size={20} color="#6B7280" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('settings.billingHistory.title')}</Text>
                  <Text style={styles.settingSubtitle}>
                    {t('settings.billingHistory.subtitle')}
                  </Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Notifications Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.sections.notifications')}</Text>
            <View style={styles.settingsGroup}>
              <View style={styles.settingItem}>
                <View style={styles.settingIcon}>
                  <Smartphone size={20} color="#6B7280" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('settings.pushNotifications.title')}</Text>
                  <Text style={styles.settingSubtitle}>{t('settings.pushNotifications.subtitle')}</Text>
                </View>
                <Switch
                  value={pushNotifications}
                  onValueChange={updatePushNotifications}
                  trackColor={{ false: '#F3F4F6', true: '#FEE2E2' }}
                  thumbColor={pushNotifications ? '#EF4444' : '#9CA3AF'}
                />
              </View>
              
              <View style={styles.separator} />
              
              <View style={styles.settingItem}>
                <View style={styles.settingIcon}>
                  <Mail size={20} color="#6B7280" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('settings.emailNotifications.title')}</Text>
                  <Text style={styles.settingSubtitle}>{t('settings.emailNotifications.subtitle')}</Text>
                </View>
                <Switch
                  value={emailNotifications}
                  onValueChange={updateEmailNotifications}
                  trackColor={{ false: '#F3F4F6', true: '#FEE2E2' }}
                  thumbColor={emailNotifications ? '#EF4444' : '#9CA3AF'}
                />
              </View>
              
              <View style={styles.separator} />
              
              <TouchableOpacity style={styles.settingItem} onPress={cycleDigestFrequency}>
                <View style={styles.settingIcon}>
                  <Bell size={20} color="#6B7280" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>
                    {t('settings.digestFrequency.title')}
                  </Text>
                  <Text style={styles.settingSubtitle}>
                    {t('settings.digestFrequency.subtitle')}
                  </Text>
                </View>
                <Text style={styles.settingValue}>{getDigestFrequencyLabel()}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Appearance Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.sections.appearance')}</Text>
            <View style={styles.settingsGroup}>
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => setShowThemeSelector(true)}
              >
                <View style={styles.settingIcon}>
                  {getThemeIcon()}
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('settings.theme.title')}</Text>
                  <Text style={styles.settingSubtitle}>{getThemeLabel()}</Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
              
              <View style={styles.separator} />

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => setShowLanguageSelector(true)}
              >
                <View style={styles.settingIcon}>
                  <Globe size={20} color="#6B7280" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('settings.language.title')}</Text>
                  <Text style={styles.settingSubtitle}>{getLanguageLabel(currentLanguage)}</Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
              
              <View style={styles.separator} />
              
              <View style={styles.settingItem}>
                <View style={styles.settingIcon}>
                  <Type size={20} color="#6B7280" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('settings.fontSize.title')}</Text>
                  <Text style={styles.settingSubtitle}>{t('settings.fontSize.percent', { percent: Math.round(fontSize * 100) })}</Text>
                </View>
                <View style={styles.fontSizeContainer}>
                  <TouchableOpacity
                    style={styles.fontSizeButton}
                    onPress={() => updateFontSize(Math.max(0.8, fontSize - 0.1))}
                  >
                    <Text style={styles.fontSizeButtonText}>-</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.fontSizeButton}
                    onPress={() => updateFontSize(Math.min(1.2, fontSize + 0.1))}
                  >
                    <Text style={styles.fontSizeButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Data & Privacy Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.sections.dataPrivacy')}</Text>
            <View style={styles.settingsGroup}>
              <TouchableOpacity 
                style={[styles.settingItem, dataExportInProgress && styles.settingItemDisabled]}
                onPress={handleExportData}
                disabled={dataExportInProgress}
              >
                <View style={styles.settingIcon}>
                  <Download size={20} color="#6B7280" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('settings.exportData.title')}</Text>
                  <Text style={styles.settingSubtitle}>{t('settings.exportData.subtitle')}</Text>
                </View>
                {dataExportInProgress ? (
                  <Text style={styles.loadingText}>{t('common.exporting')}</Text>
                ) : (
                  <ChevronRight size={20} color="#9CA3AF" />
                )}
              </TouchableOpacity>
              
              <View style={styles.separator} />
              
              <TouchableOpacity 
                style={[styles.settingItem, styles.settingItemDisabled]}
                onPress={handleImportData}
                disabled={true}
              >
                <View style={styles.settingIcon}>
                  <Upload size={20} color="#6B7280" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, styles.settingTitleDisabled]}>{t('settings.importData.title')}</Text>
                  <Text style={[styles.settingSubtitle, styles.settingSubtitleDisabled]}>
                    {t('settings.importData.subtitle')}
                  </Text>
                </View>
                {renderComingSoonBadge()}
              </TouchableOpacity>
              
              <View style={styles.separator} />
              
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={handleDeleteAccount}
              >
                <View style={styles.settingIcon}>
                  <Trash2 size={20} color="#EF4444" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('settings.deleteAccount.title')}</Text>
                  <Text style={styles.settingSubtitle}>{t('settings.deleteAccount.subtitle')}</Text>
                </View>
                <ChevronRight size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.sections.about')}</Text>
            <View style={styles.settingsGroup}>
              <View style={styles.settingItem}>
                <View style={styles.settingIcon}>
                  <Info size={20} color="#6B7280" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('settings.version.title')}</Text>
                  <Text style={styles.settingSubtitle}>{t('settings.version.value')}</Text>
                </View>
              </View>
              
              <View style={styles.separator} />
              
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => openExternalLink(TERMS_OF_SERVICE_URL)}
              >
                <View style={styles.settingIcon}>
                  <ExternalLink size={20} color="#6B7280" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('settings.termsOfService.title')}</Text>
                  <Text style={styles.settingSubtitle}>{t('settings.termsOfService.subtitle')}</Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
              
              <View style={styles.separator} />
              
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => openExternalLink(PRIVACY_POLICY_URL)}
              >
                <View style={styles.settingIcon}>
                  <ExternalLink size={20} color="#6B7280" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('settings.privacyPolicy.title')}</Text>
                  <Text style={styles.settingSubtitle}>{t('settings.privacyPolicy.subtitle')}</Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {__DEV__ && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('settings.sections.developer')}</Text>
              <View style={styles.settingsGroup}>
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={() => {
                    trackButtonPress('settings', 'crashlytics_test_crash');
                    forceTestCrash();
                  }}
                >
                  <View style={styles.settingIcon}>
                    <Shield size={20} color="#EF4444" />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingTitle, { color: '#EF4444' }]}>{t('settings.testCrash.title')}</Text>
                    <Text style={styles.settingSubtitle}>
                      {t('settings.testCrash.subtitle')}
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Theme Selector Modal */}
        {showThemeSelector && (
          <View style={styles.modalOverlay}>
            <View style={styles.themeModal}>
              <Text style={styles.themeModalTitle}>{t('settings.theme.chooseTheme')}</Text>
              
              {(['light', 'dark', 'system'] as const).map((themeOption) => (
                <TouchableOpacity
                  key={themeOption}
                  style={[
                    styles.themeOption,
                    theme === themeOption && styles.themeOptionSelected
                  ]}
                  onPress={() => {
                    const sanitizedTheme = themeOption?.trim();
                    if (sanitizedTheme && sanitizedTheme.length > 0) {
                      updateTheme(themeOption);
                      setShowThemeSelector(false);
                    }
                  }}
                >
                  <View style={styles.themeOptionContent}>
                    {themeOption === 'light' && <Sun size={20} color="#6B7280" />}
                    {themeOption === 'dark' && <Moon size={20} color="#6B7280" />}
                    {themeOption === 'system' && <Monitor size={20} color="#6B7280" />}
                    <Text style={styles.themeOptionText}>
                      {t(`settings.theme.${themeOption}`)}
                    </Text>
                  </View>
                  {theme === themeOption && (
                    <View style={styles.themeOptionCheck}>
                      <Text style={styles.themeOptionCheckText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={styles.themeModalCancel}
                onPress={() => setShowThemeSelector(false)}
              >
                <Text style={styles.themeModalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showLanguageSelector && (
          <View style={styles.modalOverlay}>
            <View style={styles.themeModal}>
              <Text style={styles.themeModalTitle}>{t('settings.language.chooseLanguage')}</Text>

              <TouchableOpacity
                style={[
                  styles.themeOption,
                  currentLanguage === getDeviceLanguage() && styles.themeOptionSelected,
                ]}
                onPress={() => handleLanguageChange('system')}
              >
                <View style={styles.themeOptionContent}>
                  <Globe size={20} color="#6B7280" />
                  <Text style={styles.themeOptionText}>{getLanguageLabel('system')}</Text>
                </View>
              </TouchableOpacity>

              {SUPPORTED_LANGUAGES.map((language) => (
                <TouchableOpacity
                  key={language}
                  style={[
                    styles.themeOption,
                    currentLanguage === language && styles.themeOptionSelected,
                  ]}
                  onPress={() => handleLanguageChange(language)}
                >
                  <View style={styles.themeOptionContent}>
                    <Text style={styles.themeOptionText}>{t(`languages.${language}`)}</Text>
                  </View>
                  {currentLanguage === language && (
                    <View style={styles.themeOptionCheck}>
                      <Text style={styles.themeOptionCheckText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.themeModalCancel}
                onPress={() => setShowLanguageSelector(false)}
              >
                <Text style={styles.themeModalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

const createStyles = (colors: AppColors, font: (size: number) => number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: font(18),
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  settingsGroup: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: 60,
  },
  settingItemDisabled: {
    opacity: 0.6,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: font(16),
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  settingTitleDisabled: {
    color: colors.textMuted,
  },
  settingSubtitle: {
    fontSize: font(14),
    color: colors.textSecondary,
  },
  settingValue: {
    fontSize: font(14),
    fontWeight: '600',
    color: '#4F46E5',
    marginLeft: 8,
  },
  settingSubtitleDisabled: {
    color: '#D1D5DB',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 72,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  statusDotActive: {
    backgroundColor: '#10B981',
  },
  comingSoonBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: font(12),
    fontWeight: '500',
    color: '#D97706',
  },
  fontSizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fontSizeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  fontSizeButtonText: {
    fontSize: font(18),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  loadingText: {
    fontSize: font(14),
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  bottomSpacing: {
    height: 32,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeModal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 32,
    minWidth: 280,
  },
  themeModalTitle: {
    fontSize: font(18),
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  themeOptionSelected: {
    backgroundColor: colors.surfaceMuted,
  },
  themeOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeOptionText: {
    fontSize: font(16),
    fontWeight: '500',
    color: colors.text,
    marginLeft: 12,
  },
  themeOptionCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionCheckText: {
    fontSize: font(12),
    fontWeight: '600',
    color: 'white',
  },
  themeModalCancel: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  themeModalCancelText: {
    fontSize: font(16),
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
