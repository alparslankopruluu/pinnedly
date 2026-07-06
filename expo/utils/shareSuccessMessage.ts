import { TFunction } from 'i18next';

export function getShareSuccessMessage(
  bookmarkTitle: string | undefined,
  t: TFunction
): string {
  const title = bookmarkTitle?.trim();
  if (title) return title;
  return t('shareIntent.linkSavedToReadLater');
}