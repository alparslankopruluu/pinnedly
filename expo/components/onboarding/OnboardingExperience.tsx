import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  I18nManager,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  FileText,
  FolderOpen,
  Link2,
  ListTodo,
  Sparkles,
  Users,
} from '@/components/icons/lucide';
import { useReducedMotion } from '@/hooks/useAccessibilityPreferences';
import { useAppAppearance } from '@/hooks/useAppAppearance';
import { trackOnboardingEvent } from '@/lib/analytics';
import { CURRENT_ONBOARDING_VERSION } from '@/lib/onboardingState';

const CAPTURE_MASCOT = require('@/assets/onboarding/onboarding-capture.webp');
const ORGANIZE_MASCOT = require('@/assets/onboarding/onboarding-organize.webp');
const COLLABORATE_MASCOT = require('@/assets/onboarding/onboarding-collaborate.webp');

const SCREEN_COUNT = 3;
const CHIP_WIDTH = 124;
const CHIP_HEIGHT = 36;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

type NavigationMethod = 'swipe' | 'button';
type CompletionMethod = 'completed' | 'skipped';
type IconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type OnboardingScreen = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  halo: string;
  mascot: number;
};

type ChipDefinition = {
  id: string;
  label: string;
  color: string;
  icon: IconComponent;
};

type ChipPose = readonly [x: number, y: number, rotation: number, scale: number];

const CHIP_POSES: readonly (readonly ChipPose[])[] = [
  [
    [-106, -86, -8, 1],
    [76, -94, 9, 1],
    [-118, -8, 7, 1],
    [88, -4, -7, 1],
    [-86, 80, -5, 1],
    [78, 78, 7, 1],
  ],
  [
    [72, -102, 0, 0.92],
    [72, -67, 0, 0.92],
    [72, -32, 0, 0.92],
    [72, 3, 0, 0.92],
    [72, 38, 0, 0.92],
    [72, 73, 0, 0.92],
  ],
  [
    [-88, -78, -4, 0.92],
    [88, -78, 4, 0.92],
    [-88, -2, -2, 0.92],
    [88, -2, 2, 0.92],
    [-82, 72, -2, 0.92],
    [82, 72, 2, 0.92],
  ],
];

function clampScreen(value: number): number {
  'worklet';
  return Math.min(SCREEN_COUNT - 1, Math.max(0, value));
}

function HaloLayer({
  color,
  index,
  progress,
}: {
  color: string;
  index: number;
  progress: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [index - 0.8, index, index + 0.8],
      [0, 1, 0],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, animatedStyle]}>
      <Svg width="100%" height="100%" viewBox="0 0 400 320">
        <Defs>
          <RadialGradient id={`halo-${index}`} cx="50%" cy="42%" r="54%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <Stop offset="58%" stopColor={color} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="200" cy="150" r="148" fill={`url(#halo-${index})`} />
      </Svg>
    </Animated.View>
  );
}

function MascotLayer({
  index,
  progress,
  source,
  reduceMotion,
  organizeOffset,
}: {
  index: number;
  progress: SharedValue<number>;
  source: number;
  reduceMotion: boolean;
  organizeOffset: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      progress.value,
      [index - 0.72, index, index + 0.72],
      [0, 1, 0],
      Extrapolation.CLAMP
    );
    const characterScale = index === 2 ? 0.88 : 1;
    const scale = reduceMotion
      ? characterScale
      : interpolate(
          progress.value,
          [index - 1, index, index + 1],
          [0.96 * characterScale, characterScale, 0.96 * characterScale],
          Extrapolation.CLAMP
        );

    const translateX = index === 1 && !reduceMotion ? organizeOffset : 0;
    return { opacity, transform: [{ translateX }, { scale }] };
  }, [index, organizeOffset, reduceMotion]);

  return (
    <Animated.View pointerEvents="none" style={[styles.mascotLayer, animatedStyle]}>
      <Image source={source} style={styles.mascotImage} resizeMode="contain" />
    </Animated.View>
  );
}

function IdeaChip({
  chip,
  index,
  progress,
  reduceMotion,
  surfaceColor,
  textColor,
  positionScale,
}: {
  chip: ChipDefinition;
  index: number;
  progress: SharedValue<number>;
  reduceMotion: boolean;
  surfaceColor: string;
  textColor: string;
  positionScale: number;
}) {
  const entry = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    entry.value = reduceMotion
      ? 1
      : withDelay(index * 48, withTiming(1, { duration: 240, easing: EASE_OUT }));
  }, [entry, index, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    const poses = CHIP_POSES.map((screen) => screen[index]);
    const roundedProgress = Math.round(progress.value);
    const x = reduceMotion
      ? poses[roundedProgress][0] * positionScale
      : interpolate(progress.value, [0, 1, 2], poses.map((pose) => pose[0] * positionScale));
    const y = reduceMotion
      ? poses[roundedProgress][1]
      : interpolate(progress.value, [0, 1, 2], poses.map((pose) => pose[1]));
    const rotation = reduceMotion
      ? 0
      : interpolate(progress.value, [0, 1, 2], poses.map((pose) => pose[2]));
    const poseScale = reduceMotion
      ? 1
      : interpolate(progress.value, [0, 1, 2], poses.map((pose) => pose[3]));

    return {
      opacity: entry.value,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${rotation}deg` },
        { scale: poseScale * interpolate(entry.value, [0, 1], [0.94, 1]) },
      ],
    };
  }, [index, positionScale, reduceMotion]);

  const ChipIcon = chip.icon;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ideaChip,
        {
          backgroundColor: surfaceColor,
          borderColor: `${chip.color}35`,
          shadowColor: chip.color,
        },
        animatedStyle,
      ]}
    >
      <View style={[styles.chipIcon, { backgroundColor: `${chip.color}1F` }]}>
        <ChipIcon size={15} color={chip.color} strokeWidth={2.4} />
      </View>
      <Text style={[styles.chipText, { color: textColor }]} numberOfLines={1} maxFontSizeMultiplier={1.25}>
        {chip.label}
      </Text>
    </Animated.View>
  );
}

function ProgressDot({ index, progress, color }: { index: number; progress: SharedValue<number>; color: string }) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(progress.value - index);
    return {
      opacity: interpolate(distance, [0, 1], [1, 0.35], Extrapolation.CLAMP),
      transform: [{ scaleX: interpolate(distance, [0, 1], [2.2, 1], Extrapolation.CLAMP) }],
    };
  });

  return <Animated.View style={[styles.progressDot, { backgroundColor: color }, animatedStyle]} />;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function OnboardingExperience({
  onComplete,
}: {
  onComplete: (
    method: CompletionMethod,
    details: { step: number; screenId: string; navigationMethod: NavigationMethod }
  ) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { colors, font, isDark } = useAppAppearance();
  const { width, height, fontScale } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const isRTL = I18nManager.isRTL;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [contentWidth, setContentWidth] = useState(Math.max(280, width - 40));
  const activeIndexRef = useRef(0);
  const completingRef = useRef(false);
  const mountedRef = useRef(true);
  const startedRef = useRef(false);
  const progress = useSharedValue(0);
  const gestureStart = useSharedValue(0);
  const reducedOpacity = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  const compact = height < 740 || fontScale >= 1.35;

  const screens = useMemo<OnboardingScreen[]>(() => [
    {
      id: 'capture',
      title: t('welcome.screens.captureEverything.title'),
      subtitle: t('welcome.screens.captureEverything.subtitle'),
      description: t('welcome.screens.captureEverything.description'),
      color: '#F04444',
      halo: '#FB7185',
      mascot: CAPTURE_MASCOT,
    },
    {
      id: 'organize',
      title: t('welcome.screens.organizeProjects.title'),
      subtitle: t('welcome.screens.organizeProjects.subtitle'),
      description: t('welcome.screens.organizeProjects.description'),
      color: '#F59E0B',
      halo: '#FBBF24',
      mascot: ORGANIZE_MASCOT,
    },
    {
      id: 'think-share',
      title: t('welcome.screens.thinkAndShare.title'),
      subtitle: t('welcome.screens.thinkAndShare.subtitle'),
      description: t('welcome.screens.thinkAndShare.description'),
      color: '#6366F1',
      halo: '#818CF8',
      mascot: COLLABORATE_MASCOT,
    },
  ], [t]);

  const chips = useMemo<ChipDefinition[]>(() => [
    { id: 'quick-note', label: t('welcome.onboarding.cards.quickNote'), color: '#F04444', icon: FileText },
    { id: 'save-link', label: t('welcome.onboarding.cards.saveLink'), color: '#EC4899', icon: Link2 },
    { id: 'plan-task', label: t('welcome.onboarding.cards.planTask'), color: '#F59E0B', icon: ListTodo },
    { id: 'project', label: t('welcome.onboarding.cards.project'), color: '#06B6D4', icon: FolderOpen },
    { id: 'ai-summary', label: t('welcome.onboarding.cards.aiSummary'), color: '#8B5CF6', icon: Sparkles },
    { id: 'collaborate', label: t('welcome.onboarding.cards.collaborate'), color: '#4F46E5', icon: Users },
  ], [t]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void trackOnboardingEvent('onboarding_started', {
      step: 0,
      screen_id: screens[0].id,
      onboarding_version: CURRENT_ONBOARDING_VERSION,
    });
  }, [screens]);

  const commitIndex = useCallback((target: number, method: NavigationMethod) => {
    const clampedTarget = clampScreen(target);
    const previous = activeIndexRef.current;
    activeIndexRef.current = clampedTarget;
    setActiveIndex(clampedTarget);

    if (clampedTarget !== previous) {
      void trackOnboardingEvent('onboarding_step', {
        step: clampedTarget,
        screen_id: screens[clampedTarget].id,
        navigation_method: method,
        onboarding_version: CURRENT_ONBOARDING_VERSION,
      });
    }

    if (reduceMotion) {
      reducedOpacity.value = withTiming(0, { duration: 100, easing: EASE_OUT }, (finished) => {
        if (!finished) return;
        progress.value = clampedTarget;
        reducedOpacity.value = withTiming(1, { duration: 80, easing: EASE_OUT });
      });
      return;
    }

    progress.value = withSpring(clampedTarget, {
      mass: 1,
      stiffness: 150,
      damping: 18,
    });
  }, [progress, reduceMotion, reducedOpacity, screens]);

  const handleGestureEnd = useCallback((target: number) => {
    const current = activeIndexRef.current;
    commitIndex(Math.min(current + 1, Math.max(current - 1, target)), 'swipe');
  }, [commitIndex]);

  const panGesture = useMemo(() => Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      gestureStart.value = progress.value;
    })
    .onUpdate((event) => {
      if (reduceMotion) return;
      const direction = isRTL ? 1 : -1;
      progress.value = clampScreen(gestureStart.value + (event.translationX * direction) / Math.max(contentWidth, 1));
    })
    .onEnd((event) => {
      const direction = isRTL ? 1 : -1;
      const projected = reduceMotion
        ? gestureStart.value + ((event.translationX + event.velocityX * 0.16) * direction) / Math.max(contentWidth, 1)
        : progress.value + (event.velocityX * direction * 0.16) / Math.max(contentWidth, 1);
      runOnJS(handleGestureEnd)(Math.round(clampScreen(projected)));
    }), [contentWidth, gestureStart, handleGestureEnd, isRTL, progress, reduceMotion]);

  const copyTrackStyle = useAnimatedStyle(() => ({
    opacity: reducedOpacity.value,
    transform: [{
      translateX: isRTL
        ? (progress.value - (SCREEN_COUNT - 1)) * contentWidth
        : -progress.value * contentWidth,
    }],
  }), [contentWidth, isRTL]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const complete = useCallback(async (method: CompletionMethod) => {
    if (completingRef.current) return;
    completingRef.current = true;
    setIsCompleting(true);
    try {
      const index = activeIndexRef.current;
      await onComplete(method, {
        step: index,
        screenId: screens[index].id,
        navigationMethod: 'button',
      });
    } finally {
      completingRef.current = false;
      if (mountedRef.current) setIsCompleting(false);
    }
  }, [onComplete, screens]);

  const handleNext = useCallback(() => {
    const index = activeIndexRef.current;
    if (index >= SCREEN_COUNT - 1) {
      void complete('completed');
      return;
    }
    commitIndex(index + 1, 'button');
  }, [commitIndex, complete]);

  const handleContentLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== contentWidth) setContentWidth(nextWidth);
  }, [contentWidth]);

  const orderedScreens = isRTL ? [...screens].reverse() : screens;
  const currentScreen = screens[activeIndex];
  const heroHeight = compact ? 260 : Math.min(340, Math.max(292, height * 0.38));
  const positionScale = Math.min(
    1,
    Math.max(0.6, (contentWidth / 2 - CHIP_WIDTH / 2 - 6) / 118)
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: SCREEN_COUNT, now: activeIndex + 1 }}
          style={styles.progressRow}
        >
          {screens.map((screen, index) => (
            <ProgressDot key={screen.id} index={index} progress={progress} color={currentScreen.color} />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityHint={t('welcome.onboarding.skipHint')}
          disabled={isCompleting}
          hitSlop={8}
          onPress={() => void complete('skipped')}
          style={styles.skipButton}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }, isCompleting && styles.disabledText]}>
            {t('common.skip')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <GestureDetector gesture={panGesture}>
          <View
            onLayout={handleContentLayout}
            style={styles.swipeRegion}
          >
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={`${currentScreen.title}. ${currentScreen.description}`}
              accessibilityHint={t('welcome.onboarding.swipeHint')}
              style={[styles.heroStage, { height: heroHeight }]}
            >
              {screens.map((screen, index) => (
                <HaloLayer key={screen.id} color={screen.halo} index={index} progress={progress} />
              ))}

              <View style={styles.chipOrigin} pointerEvents="none">
                {chips.map((chip, index) => (
                  <IdeaChip
                    key={chip.id}
                    chip={chip}
                    index={index}
                    progress={progress}
                    reduceMotion={reduceMotion}
                    surfaceColor={isDark ? colors.surface : '#FFFFFFF2'}
                    textColor={colors.text}
                    positionScale={positionScale}
                  />
                ))}
              </View>

              {screens.map((screen, index) => (
                <MascotLayer
                  key={screen.id}
                  index={index}
                  progress={progress}
                  source={screen.mascot}
                  reduceMotion={reduceMotion}
                  organizeOffset={-54 * positionScale}
                />
              ))}
            </View>

            <View style={styles.copyViewport}>
              <Animated.View
                style={[
                  styles.copyTrack,
                  { width: contentWidth * SCREEN_COUNT },
                  copyTrackStyle,
                ]}
              >
                {orderedScreens.map((screen) => (
                  <View
                    key={screen.id}
                    accessibilityElementsHidden={screen.id !== currentScreen.id}
                    importantForAccessibility={screen.id === currentScreen.id ? 'auto' : 'no-hide-descendants'}
                    style={[styles.copyPage, { width: contentWidth }]}
                  >
                    <Text style={[styles.eyebrow, { color: screen.color }]} maxFontSizeMultiplier={1.45}>
                      {screen.subtitle}
                    </Text>
                    <Text style={[styles.title, { color: colors.text, fontSize: font(29) }]} maxFontSizeMultiplier={1.45}>
                      {screen.title}
                    </Text>
                    <Text
                      style={[styles.description, { color: colors.textSecondary, fontSize: font(15.5) }]}
                      maxFontSizeMultiplier={1.75}
                    >
                      {screen.description}
                    </Text>
                  </View>
                ))}
              </Animated.View>
            </View>
          </View>
        </GestureDetector>

        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={activeIndex === SCREEN_COUNT - 1 ? t('common.getStarted') : t('common.next')}
          disabled={isCompleting}
          onPress={handleNext}
          onPressIn={() => {
            buttonScale.value = withTiming(0.97, { duration: 140, easing: EASE_OUT });
          }}
          onPressOut={() => {
            buttonScale.value = withTiming(1, { duration: 110, easing: EASE_OUT });
          }}
          style={[
            styles.primaryButton,
            { backgroundColor: currentScreen.color, shadowColor: currentScreen.color },
            isCompleting && styles.disabledButton,
            buttonAnimatedStyle,
          ]}
        >
          <Text style={styles.primaryButtonText} maxFontSizeMultiplier={1.4}>
            {activeIndex === SCREEN_COUNT - 1 ? t('common.getStarted') : t('common.next')}
          </Text>
          <ChevronRight
            size={20}
            color="#FFFFFF"
            style={isRTL ? styles.rtlChevron : undefined}
          />
        </AnimatedPressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    minHeight: 58,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 44,
    paddingHorizontal: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  skipButton: {
    minWidth: 54,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '700',
  },
  disabledText: {
    opacity: 0.45,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  swipeRegion: {
    flexGrow: 1,
  },
  heroStage: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  chipOrigin: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 1,
    height: 1,
    zIndex: 2,
  },
  ideaChip: {
    position: 'absolute',
    left: -CHIP_WIDTH / 2,
    top: -CHIP_HEIGHT / 2,
    width: CHIP_WIDTH,
    height: CHIP_HEIGHT,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    gap: 6,
    shadowOpacity: 0.13,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  chipIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
  },
  mascotLayer: {
    position: 'absolute',
    width: 168,
    height: 168,
    zIndex: 3,
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },
  copyViewport: {
    width: '100%',
    overflow: 'hidden',
    minHeight: 176,
  },
  copyTrack: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  copyPage: {
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  eyebrow: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  title: {
    lineHeight: 36,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.7,
    marginBottom: 10,
  },
  description: {
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 520,
  },
  primaryButton: {
    minHeight: 56,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  rtlChevron: {
    transform: [{ rotate: '180deg' }],
  },
});
