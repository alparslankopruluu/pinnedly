import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
} from '@/components/icons/lucide';
import { useReducedMotion } from '@/hooks/useAccessibilityPreferences';

export type DialogVariant = 'default' | 'success' | 'error' | 'info' | 'warning';
export type DialogButtonStyle = 'default' | 'cancel' | 'destructive';

export interface DialogButton {
  text: string;
  onPress?: () => void;
  style?: DialogButtonStyle;
}

export interface AppDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  variant?: DialogVariant;
  buttons: DialogButton[];
  onDismiss: () => void;
}

const VARIANT_CONFIG: Record<
  DialogVariant,
  { icon: typeof CheckCircle2; color: string; background: string }
> = {
  default: { icon: AlertCircle, color: '#EF4444', background: '#FEE2E2' },
  success: { icon: CheckCircle2, color: '#10B981', background: '#D1FAE5' },
  error: { icon: AlertCircle, color: '#EF4444', background: '#FEE2E2' },
  info: { icon: Info, color: '#3B82F6', background: '#DBEAFE' },
  warning: { icon: TriangleAlert, color: '#F59E0B', background: '#FEF3C7' },
};

function getButtonStyles(style: DialogButtonStyle = 'default') {
  switch (style) {
    case 'cancel':
      return { button: styles.buttonSecondary, text: styles.buttonSecondaryText };
    case 'destructive':
      return { button: styles.buttonDestructive, text: styles.buttonDestructiveText };
    default:
      return { button: styles.buttonPrimary, text: styles.buttonPrimaryText };
  }
}

export function AppDialog({
  visible,
  title,
  message,
  variant = 'default',
  buttons,
  onDismiss,
}: AppDialogProps) {
  const { icon: Icon, color, background } = VARIANT_CONFIG[variant];
  const useStackedButtons = buttons.length > 2;
  const reduceMotion = useReducedMotion();

  const handlePress = (button: DialogButton) => {
    onDismiss();
    button.onPress?.();
  };

  return (
    <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()} accessibilityViewIsModal accessibilityRole="alert">
          <View style={[styles.iconWrap, { backgroundColor: background }]}>
            <Icon size={28} color={color} strokeWidth={2.2} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={[styles.actions, useStackedButtons && styles.actionsStacked]}>
            {buttons.map((button, index) => {
              const buttonStyles = getButtonStyles(button.style);
              return (
                <Pressable
                  key={`${button.text}-${index}`}
                  style={({ pressed }) => [
                    styles.button,
                    buttonStyles.button,
                    useStackedButtons && styles.buttonStacked,
                    !useStackedButtons && buttons.length === 1 && styles.buttonFull,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => handlePress(button)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.buttonText, buttonStyles.text]} numberOfLines={1}>
                    {button.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionsStacked: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  buttonFull: {
    flex: 0,
    width: '100%',
  },
  buttonStacked: {
    flex: 0,
    width: '100%',
  },
  buttonPrimary: {
    backgroundColor: '#EF4444',
  },
  buttonSecondary: {
    backgroundColor: '#F3F4F6',
  },
  buttonDestructive: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
  },
  buttonSecondaryText: {
    color: '#374151',
  },
  buttonDestructiveText: {
    color: '#DC2626',
  },
});
