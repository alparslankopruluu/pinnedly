import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useAuth } from '@/store/useAuthStore';
import { trackButtonPress } from '@/lib/analytics';
import { Button } from '@/components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from '@/components/icons/lucide';

export default function PhoneSignIn() {
  const { t } = useTranslation();
  const { sendPhoneVerification, confirmPhoneCode, isLoading } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const handleSendCode = async () => {
    const normalized = phoneNumber.trim();
    if (!normalized) {
      showAppAlert(t('common.error'), t('auth.errors.enterPhone'), undefined, { variant: 'error' });
      return;
    }

    try {
      await trackButtonPress('phone_sign_in', 'send_code');
      await sendPhoneVerification(normalized.startsWith('+') ? normalized : `+${normalized}`);
      setCodeSent(true);
      showAppAlert(t('auth.alerts.codeSent'), t('auth.alerts.enterCodeFromSms'));
    } catch (error) {
      showAppAlert(t('auth.alerts.failed'), error instanceof Error ? error.message : t('auth.errors.couldNotSendCode'));
    }
  };

  const handleConfirmCode = async () => {
    if (!verificationCode.trim()) {
      showAppAlert(t('common.error'), t('auth.errors.enterVerificationCode'), undefined, { variant: 'error' });
      return;
    }

    try {
      await trackButtonPress('phone_sign_in', 'verify_code');
      await confirmPhoneCode(verificationCode.trim());
      router.replace('/(tabs)');
    } catch (error) {
      showAppAlert(t('auth.errors.verificationFailed'), error instanceof Error ? error.message : t('auth.errors.invalidCode'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('auth.phoneSignIn')}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.hint}>
          {t('auth.phoneHint')}
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t('auth.phoneNumber')}</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder={t('auth.placeholders.phone')}
            keyboardType="phone-pad"
            editable={!codeSent}
          />
        </View>

        {codeSent && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.verificationCode')}</Text>
            <TextInput
              style={styles.input}
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder={t('auth.placeholders.verificationCode')}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
        )}

        {!codeSent ? (
          <Button
            title={isLoading ? t('common.sending') : t('auth.sendCode')}
            onPress={handleSendCode}
            disabled={isLoading}
            style={styles.primaryButton}
          />
        ) : (
          <>
            <Button
              title={isLoading ? t('common.verifying') : t('auth.verifyAndSignIn')}
              onPress={handleConfirmCode}
              disabled={isLoading}
              style={styles.primaryButton}
            />
            <TouchableOpacity onPress={() => setCodeSent(false)} style={styles.resendLink}>
              <Text style={styles.resendText}>{t('auth.changePhoneNumber')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1e293b',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  hint: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
    marginTop: 8,
  },
  resendLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendText: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
