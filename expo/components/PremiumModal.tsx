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

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$9.99',
    period: '/month',
    features: [
      'Unlimited bookmark lists',
      'Collaborative projects',
      'Voice notes',
      'Advanced reminders',
      'Priority support',
    ],
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '$79.99',
    period: '/year',
    originalPrice: '$119.88',
    savings: 'Save 33%',
    popular: true,
    features: [
      'Everything in Monthly',
      'Advanced analytics',
      'Custom themes',
      'Export to multiple formats',
      'Team management tools',
      'API access',
    ],
  },
];

const premiumFeatures = [
  {
    icon: <Users size={24} color="#6366F1" />,
    title: 'Team Collaboration',
    description: 'Share projects and lists with your team members',
  },
  {
    icon: <Mic size={24} color="#6366F1" />,
    title: 'Voice Notes',
    description: 'Record and transcribe voice memos instantly',
  },
  {
    icon: <Bell size={24} color="#6366F1" />,
    title: 'Smart Reminders',
    description: 'AI-powered notifications and nudges',
  },
  {
    icon: <Zap size={24} color="#6366F1" />,
    title: 'Advanced Features',
    description: 'Unlock powerful productivity tools',
  },
];

export function PremiumModal({ visible, onClose }: PremiumModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>('yearly');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  const scaleAnim = useMemo(() => new Animated.Value(0.9), []);
  const opacityAnim = useMemo(() => new Animated.Value(0), []);

  React.useEffect(() => {
    if (visible) {
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

  const handleSubscribe = async () => {
    setIsProcessing(true);
    
    // Simulate subscription process
    setTimeout(() => {
      setIsProcessing(false);
      onClose();
      // Here you would integrate with your payment processor
      console.log('Subscribing to plan:', selectedPlan);
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
      onPress={() => setSelectedPlan(plan.id)}
    >
      {plan.popular && (
        <View style={styles.popularBadge}>
          <Crown size={16} color="#FFFFFF" />
          <Text style={styles.popularText}>Most Popular</Text>
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
                  <Text style={styles.title}>Upgrade to Premium</Text>
                  <Text style={styles.subtitle}>Unlock powerful features</Text>
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
              <Text style={styles.sectionTitle}>Choose Your Plan</Text>
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
                {isProcessing ? 'Processing...' : 'Start Free Trial'}
              </Text>
            </TouchableOpacity>

            {/* Terms */}
            <Text style={styles.termsText}>
              7-day free trial, then {subscriptionPlans.find(p => p.id === selectedPlan)?.price}{subscriptionPlans.find(p => p.id === selectedPlan)?.period}. Cancel anytime.
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