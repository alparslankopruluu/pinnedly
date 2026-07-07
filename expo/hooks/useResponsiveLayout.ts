import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { getBreakpoint, getReadableContentWidth, type AppBreakpoint } from '@/utils/platform';

export type ResponsiveLayout = {
  width: number;
  height: number;
  breakpoint: AppBreakpoint;
  isTabletOrLarger: boolean;
  isDesktop: boolean;
  readableWidth: number | '100%';
};

export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const breakpoint = getBreakpoint(width);
    return {
      width,
      height,
      breakpoint,
      isTabletOrLarger: breakpoint !== 'phone',
      isDesktop: breakpoint === 'desktop',
      readableWidth: getReadableContentWidth(width),
    };
  }, [height, width]);
}
