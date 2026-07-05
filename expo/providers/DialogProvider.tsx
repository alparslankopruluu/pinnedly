import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AppDialog,
  DialogButton,
  DialogVariant,
} from '@/components/ui/AppDialog';

export interface AppAlertOptions {
  variant?: DialogVariant;
  cancelable?: boolean;
}

interface DialogState {
  visible: boolean;
  title: string;
  message?: string;
  variant: DialogVariant;
  buttons: DialogButton[];
}

const INITIAL_STATE: DialogState = {
  visible: false,
  title: '',
  message: undefined,
  variant: 'default',
  buttons: [],
};

type ShowDialogFn = (
  title: string,
  message?: string,
  buttons?: DialogButton[],
  options?: AppAlertOptions
) => void;

const dialogController: { show: ShowDialogFn | null } = { show: null };

export function showAppAlert(
  title: string,
  message?: string,
  buttons?: DialogButton[],
  options?: AppAlertOptions
): void {
  dialogController.show?.(title, message, buttons, options);
}

function inferVariant(title: string, message?: string): DialogVariant {
  const haystack = `${title} ${message ?? ''}`.toLowerCase();
  if (
    haystack.includes('başarı') ||
    haystack.includes('success') ||
    haystack.includes('saved') ||
    haystack.includes('kaydedildi')
  ) {
    return 'success';
  }
  if (
    haystack.includes('hata') ||
    haystack.includes('error') ||
    haystack.includes('failed') ||
    haystack.includes('başarısız')
  ) {
    return 'error';
  }
  if (haystack.includes('bilgi') || haystack.includes('info')) {
    return 'info';
  }
  if (haystack.includes('uyarı') || haystack.includes('warning')) {
    return 'warning';
  }
  return 'default';
}

function normalizeButtons(buttons?: DialogButton[], fallbackOk?: string): DialogButton[] {
  if (buttons && buttons.length > 0) return buttons;
  return [{ text: fallbackOk ?? 'OK', style: 'default' }];
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<DialogState>(INITIAL_STATE);
  const isVisibleRef = useRef(false);

  const dismiss = useCallback(() => {
    isVisibleRef.current = false;
    setDialog((prev) => ({ ...prev, visible: false }));
  }, []);

  const showDialog = useCallback<ShowDialogFn>(
    (title, message, buttons, options) => {
      const normalizedButtons = normalizeButtons(buttons, t('common.ok'));
      const variant = options?.variant ?? inferVariant(title, message);

      isVisibleRef.current = true;
      setDialog({
        visible: true,
        title,
        message,
        variant,
        buttons: normalizedButtons,
      });
    },
    [t]
  );

  useEffect(() => {
    dialogController.show = showDialog;
    return () => {
      dialogController.show = null;
    };
  }, [showDialog]);

  return (
    <>
      {children}
      <AppDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        variant={dialog.variant}
        buttons={dialog.buttons}
        onDismiss={dismiss}
      />
    </>
  );
}