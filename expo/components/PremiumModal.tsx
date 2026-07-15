import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { X, Crown, Check, Zap, Users, Bell } from '@/components/icons/lucide';
import { useTranslation } from 'react-i18next';
import { trackSubscriptionEvent } from '@/lib/analytics';
import { logCrashlytics } from '@/lib/crashlytics';
import type { PurchasesPackage } from 'react-native-purchases';
import {
  getPremiumPackages,
  hasPremiumEntitlement,
  isPurchaseCancelled,
  purchasePremiumPackage,
  restorePremiumPurchases,
} from '@/lib/revenuecat';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '@/lib/legal';
import { useReducedMotion } from '@/hooks/useAccessibilityPreferences';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  onEntitlementChanged?: () => Promise<unknown>;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  originalPrice?: string;
  savings?: string;
  features: string[];
  popular?: boolean;
  package?: PurchasesPackage;
}

export function PremiumModal({ visible, onClose, onEntitlementChanged }: PremiumModalProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [selectedPlan, setSelectedPlan] = useState<string>('yearly');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const nativePaywallOpen = React.useRef(false);

  React.useEffect(() => {
    if (
      (Platform.OS !== 'ios' && Platform.OS !== 'android') ||
      !visible ||
      nativePaywallOpen.current
    ) return;

    nativePaywallOpen.current = true;
    const showRevenueCatPaywall = async () => {
      try {
        const { default: RevenueCatUI, PAYWALL_RESULT } = await import('react-native-purchases-ui');
        const result = await RevenueCatUI.presentPaywall();

        if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
          await onEntitlementChanged?.();
          await trackSubscriptionEvent('subscribe_completed', { source: 'revenuecat_paywall' });
        } else if (result === PAYWALL_RESULT.CANCELLED) {
          await trackSubscriptionEvent('subscribe_cancelled', { source: 'revenuecat_paywall' });
        }
      } catch (error) {
        logCrashlytics(`RevenueCat paywall failed: ${String(error)}`);
        Alert.alert(
          t('premium.purchaseUnavailableTitle'),
          error instanceof Error ? error.message : t('premium.purchaseUnavailableMessage')
        );
      } finally {
        nativePaywallOpen.current = false;
        onClose();
      }
    };

    showRevenueCatPaywall();
  }, [visible, onClose, onEntitlementChanged, t]);

  React.useEffect(() => {
    if (!visible || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;
    setLoadError(null);
    getPremiumPackages()
      .then(setPackages)
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : String(error));
        logCrashlytics(`RevenueCat offerings failed: ${String(error)}`);
      });
  }, [visible]);

  const monthlyPackage = packages.find((item) => item.identifier === '$rc_monthly');
  const yearlyPackage = packages.find((item) => item.identifier === '$rc_annual');

  const subscriptionPlans: SubscriptionPlan[] = useMemo(
    () => [
      {
        id: 'monthly',
        name: t('premium.plans.monthly'),
        price: monthlyPackage?.product.priceString ?? '—',
        period: t('premium.plans.perMonth'),
        features: [
          t('premium.features.unlimitedContent'),
          t('premium.features.aiAssistant'),
          t('premium.features.collaborativeProjects'),
          t('premium.features.kanban'),
          t('premium.features.advancedReminders'),
          t('premium.features.fullExport'),
        ],
        package: monthlyPackage,
      },
      {
        id: 'yearly',
        name: t('premium.plans.yearly'),
        price: yearlyPackage?.product.priceString ?? '—',
        period: t('premium.plans.perYear'),
        savings: t('premium.plans.savePercent'),
        popular: true,
        features: [
          t('premium.features.unlimitedContent'),
          t('premium.features.aiAssistant'),
          t('premium.features.collaborativeProjects'),
          t('premium.features.kanban'),
          t('premium.features.advancedReminders'),
          t('premium.features.fullExport'),
        ],
        package: yearlyPackage,
      },
    ],
    [t, monthlyPackage, yearlyPackage]
  );

  const premiumFeatures = useMemo(
    () => [
      {
        icon: <Users size={24} color="#6366F1" />,
        title: t('premium.features.teamCollaboration.title'),
        description: t('premium.features.teamCollaboration.description'),
      },
      {
        icon: <Zap size={24} color="#6366F1" />,
        title: t('premium.features.ai.title'),
        description: t('premium.features.ai.description'),
      },
      {
        icon: <Bell size={24} color="#6366F1" />,
        title: t('premium.features.reminders.title'),
        description: t('premium.features.reminders.description'),
      },
      {
        icon: <Crown size={24} color="#6366F1" />,
        title: t('premium.features.organization.title'),
        description: t('premium.features.organization.description'),
      },
    ],
    [t]
  );
  
  const scaleAnim = useMemo(() => new Animated.Value(0.9), []);
  const opacityAnim = useMemo(() => new Animated.Value(0), []);

  React.useEffect(() => {
    if (visible) {
      trackSubscriptionEvent('modal_viewed');
      logCrashlytics('Premium modal opened');
      if (reduceMotion) {
        scaleAnim.setValue(1);
        opacityAnim.setValue(1);
        return;
      }
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim, reduceMotion]);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    trackSubscriptionEvent('plan_selected', { plan_id: planId });
  };

  const handleSubscribe = async () => {
    const plan = subscriptionPlans.find((item) => item.id === selectedPlan);
    if (!plan?.package) {
      Alert.alert(t('premium.purchaseUnavailableTitle'), t('premium.purchaseUnavailableMessage'));
      return;
    }
    setIsProcessing(true);
    await trackSubscriptionEvent('subscribe_started', { plan_id: selectedPlan });
    try {
      const customerInfo = await purchasePremiumPackage(plan.package);
      if (!hasPremiumEntitlement(customerInfo)) {
        throw new Error('Premium entitlement was not granted after purchase');
      }
      await onEntitlementChanged?.();
      await trackSubscriptionEvent('subscribe_completed', { plan_id: selectedPlan });
      logCrashlytics(`Subscription completed: ${selectedPlan}`);
      onClose();
    } catch (error) {
      if (isPurchaseCancelled(error)) {
        await trackSubscriptionEvent('subscribe_cancelled', { plan_id: selectedPlan });
      } else {
        await trackSubscriptionEvent('subscribe_failed', { plan_id: selectedPlan });
        Alert.alert(t('premium.purchaseFailedTitle'), error instanceof Error ? error.message : t('premium.purchaseFailedMessage'));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    setIsProcessing(true);
    await trackSubscriptionEvent('restore_started');
    try {
      const customerInfo = await restorePremiumPurchases();
      const isPremium = hasPremiumEntitlement(customerInfo);
      await onEntitlementChanged?.();
      await trackSubscriptionEvent('restore_completed', { result: isPremium ? 'premium' : 'empty' });
      Alert.alert(
        t(isPremium ? 'premium.restoreSuccessTitle' : 'premium.restoreEmptyTitle'),
        t(isPremium ? 'premium.restoreSuccessMessage' : 'premium.restoreEmptyMessage')
      );
      if (isPremium) onClose();
    } catch (error) {
      await trackSubscriptionEvent('restore_failed');
      Alert.alert(t('premium.restoreFailedTitle'), error instanceof Error ? error.message : t('premium.restoreFailedMessage'));
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPlanCard = (plan: SubscriptionPlan) => (
    <TouchableOpacity
      key={plan.id}
      style={[
        styles.planCard,
        selectedPlan === plan.id && styles.planCardSelected,
        plan.popular && styles.planCardPopular,
      ]}
      onPress={() => handlePlanSelect(plan.id)}
    >
      {plan.popular && (
        <View style={styles.popularBadge}>
          <Crown size={16} color="#FFFFFF" />
          <Text style={styles.popularText}>{t('premium.mostPopular')}</Text>
        </View>
      )}
      
      <View style={styles.planHeader}>
        <Text style={styles.planName}>{plan.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.planPrice}>{plan.price}</Text>
          <Text style={styles.planPeriod}>{plan.period}</Text>
        </View>
        {plan.originalPrice && (
          <View style={styles.savingsContainer}>
            <Text style={styles.originalPrice}>{plan.originalPrice}</Text>
            <Text style={styles.savings}>{plan.savings}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.featuresContainer}>
        {plan.features.map((feature) => (
          <View key={feature} style={styles.featureItem}>
            <Check size={16} color="#10B981" />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  // iOS uses the remotely configured and published RevenueCat paywall.
  // Keep the custom modal below as the non-iOS fallback.
  if (Platform.OS === 'ios') return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Crown size={28} color="#6366F1" />
                <View style={styles.headerText}>
                  <Text style={styles.title}>{t('premium.title')}</Text>
                  <Text style={styles.subtitle}>{t('premium.subtitle')}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Features Grid */}
            <View style={styles.featuresGrid}>
              {premiumFeatures.map((feature) => (
                <View key={feature.title} style={styles.featureCard}>
                  <View style={styles.featureIcon}>{feature.icon}</View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              ))}
            </View>

            {/* Subscription Plans */}
            <View style={styles.plansSection}>
              <Text style={styles.sectionTitle}>{t('premium.choosePlan')}</Text>
              <View style={styles.plansContainer}>
                {subscriptionPlans.map(renderPlanCard)}
              </View>
            </View>

            {/* Subscribe Button */}
            <TouchableOpacity
              style={[
                styles.subscribeButton,
                isProcessing && styles.subscribeButtonDisabled,
              ]}
              onPress={handleSubscribe}
              disabled={isProcessing}
            >
              <Text style={styles.subscribeButtonText}>
                {isProcessing ? t('common.processing') : t('premium.startFreeTrial')}
              </Text>
            </TouchableOpacity>

            {loadError ? <Text style={styles.purchaseError}>{t('premium.purchaseUnavailableMessage')}</Text> : null}
            <TouchableOpacity onPress={handleRestore} disabled={isProcessing} style={styles.restoreButton}>
              <Text style={styles.restoreButtonText}>{t('premium.restorePurchases')}</Text>
            </TouchableOpacity>

            {/* Terms */}
            <Text style={styles.termsText}>
              {t('premium.terms', {
                price: subscriptionPlans.find((p) => p.id === selectedPlan)?.price ?? '',
                period: subscriptionPlans.find((p) => p.id === selectedPlan)?.period ?? '',
              })}
            </Text>
            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}>
                <Text style={styles.legalLink}>{t('settings.termsOfService.title')}</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}>•</Text>
              <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
                <Text style={styles.legalLink}>{t('settings.privacyPolicy.title')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  plansSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  plansContainer: {
    gap: 12,
  },
  planCard: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 20,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#F8FAFC',
  },
  planCardPopular: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    right: 20,
    backgroundColor: '#6366F1',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6366F1',
  },
  planPeriod: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 4,
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  savings: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  featuresContainer: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  termsText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 10,
    lineHeight: 16,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  legalLink: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  purchaseError: {
    color: '#DC2626',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  restoreButtonText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
});
