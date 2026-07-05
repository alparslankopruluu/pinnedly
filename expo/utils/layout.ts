import { Platform } from 'react-native';

export const TAB_BAR_BASE_HEIGHT = 56;
export const TAB_BAR_EXTRA_BOTTOM = 2;
const ANDROID_MIN_BOTTOM_INSET = 8;
const FAB_GAP_ABOVE_TAB_BAR = 16;

export function getTabBarBottomInset(insetsBottom: number): number {
  const minInset = Platform.OS === 'android' ? ANDROID_MIN_BOTTOM_INSET : 0;
  return Math.max(insetsBottom, minInset) + TAB_BAR_EXTRA_BOTTOM;
}

export function getTabBarHeight(insetsBottom: number): number {
  return TAB_BAR_BASE_HEIGHT + getTabBarBottomInset(insetsBottom);
}

export function getFabBottomOffset(insetsBottom: number): number {
  return getTabBarHeight(insetsBottom) + FAB_GAP_ABOVE_TAB_BAR;
}

export function getScrollBottomPadding(insetsBottom: number): number {
  return getFabBottomOffset(insetsBottom) + 56;
}

const FOOTER_BASE_PADDING = 20;

export function getFooterBottomPadding(insetsBottom: number): number {
  const minInset = Platform.OS === 'android' ? ANDROID_MIN_BOTTOM_INSET : 0;
  return FOOTER_BASE_PADDING + Math.max(insetsBottom, minInset);
}

const OVERLAY_FAB_BASE_BOTTOM = 24;

export function getOverlayFabBottomOffset(insetsBottom: number): number {
  const minInset = Platform.OS === 'android' ? ANDROID_MIN_BOTTOM_INSET : 0;
  return OVERLAY_FAB_BASE_BOTTOM + Math.max(insetsBottom, minInset);
}