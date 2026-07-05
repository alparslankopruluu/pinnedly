import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { X, Crown, Check, Zap, Users, Bell, Mic } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { trackSubscriptionEvent } from '@/lib/analytics';
import { logCrashlytics } from '@/lib/crashlytics';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
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
}

export function PremiumModal({ visible, onClose }: PremiumModalProps) {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<string>('yearly');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const subscriptionPlans: SubscriptionPlan[] = useMemo(
    () => [
      {
        id: 'monthly',
        name: t('premium.plans.monthly'),
        price: '$9.99',
        period: t('premium.plans.perMonth'),
        features: [
          t('premium.features.unlimitedLists'),
          t('premium.features.collaborativeProjects'),
          t('premium.features.voiceNotesFeature'),
          t('premium.features.advancedReminders'),
          t('premium.features.prioritySupport'),
        ],
      },
      {
        id: 'yearly',
        name: t('premium.plans.yearly'),
        price: '$79.99',
        period: t('premium.plans.perYear'),
        originalPrice: '$119.88',
        savings: t('premium.plans.savePercent'),
        popular: true,
        features: [
          t('premium.features.everythingMonthly'),
          t('premium.features.advancedAnalytics'),
          t('premium.features.customThemes'),
          t('premium.features.exportFormats'),
          t('premium.features.teamManagement'),
          t('premium.features.apiAccess'),
        ],
      },
    ],
    [t]
  );

  const premiumFeatures = useMemo(
    () => [
      {
        icon: <Users size={24} color="#6366F1" />,
        title: t('premium.features.teamCollaboration.title'),
        description: t('premium.features.teamCollaboration.description'),
      },
      {
        icon: <Mic size={24} color="#6366F1" />,
        title: t('premium.features.voiceNotes.title'),
        description: t('premium.features.voiceNotes.description'),
      },
      {
        icon: <Bell size={24} color="#6366F1" />,
        title: t('premium.features.smartReminders.title'),
        description: t('premium.features.smartReminders.description'),
      },
      {
        icon: <Zap size={24} color="#6366F1" />,
        title: t('premium.features.advancedFeatures.title'),
        description: t('premium.features.advancedFeatures.description'),
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
  }, [visible, scaleAnim, opacityAnim]);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    trackSubscriptionEvent('plan_selected', { plan_id: planId });
  };

  const handleSubscribe = async () => {
    setIsProcessing(true);
    await trackSubscriptionEvent('subscribe_started', { plan_id: selectedPlan });

    setTimeout(async () => {
      setIsProcessing(false);
      await trackSubscriptionEvent('subscribe_completed', { plan_id: selectedPlan });
      logCrashlytics(`Subscription completed: ${selectedPlan}`);
      onClose();
    }, 2000);
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
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
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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

            {/* Terms */}
            <Text style={styles.termsText}>
              {t('premium.terms', {
                price: subscriptionPlans.find((p) => p.id === selectedPlan)?.price ?? '',
                period: subscriptionPlans.find((p) => p.id === selectedPlan)?.period ?? '',
              })}
            </Text>
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
    paddingBottom: 24,
    lineHeight: 16,
  },
});