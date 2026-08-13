export interface DialogAction {
  onPress?: () => void;
  deferUntilDismiss?: boolean;
}

function once(action: () => void): () => void {
  let hasRun = false;
  return () => {
    if (hasRun) return;
    hasRun = true;
    action();
  };
}

export function runDialogButtonAction(
  button: DialogAction,
  dismiss: () => void,
  defer: (action: () => void) => void
): void {
  dismiss();
  if (!button.onPress) return;
  if (button.deferUntilDismiss) {
    defer(once(button.onPress));
    return;
  }
  button.onPress();
}
