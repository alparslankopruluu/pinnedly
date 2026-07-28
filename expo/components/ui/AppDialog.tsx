import React, { useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  InteractionManager,
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
  // Defer action handlers until after this Modal finishes dismissing — critical
  // on iOS when the next step presents another native sheet (RevenueCat paywall).
  const pendingActionRef = useRef<(() => void) | null>(null);

  const flushPendingAction = () => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (!action) return;
    InteractionManager.runAfterInteractions(() => {
      const delayMs = Platform.OS === 'ios' ? 400 : 150;
      setTimeout(action, delayMs);
    });
  };

  const handlePress = (button: DialogButton) => {
    pendingActionRef.current = button.onPress ?? null;
    onDismiss();
    // onDismiss only flips visible=false; run after the modal has left the tree.
    flushPendingAction();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onDismiss}
      // Prefer stacking above other modals when the platform allows it.
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      statusBarTranslucent
    >
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
                  <Text
                    style={[styles.buttonText, buttonStyles.text]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    allowFontScaling
                  >
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
    flexShrink: 1,
    minHeight: 46,
    minWidth: 0,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
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
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
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
