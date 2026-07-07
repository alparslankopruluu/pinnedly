import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Sparkles } from '@/components/icons/lucide';

function TypingDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.35);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 360 }),
          withTiming(0.35, { duration: 360 })
        ),
        -1
      )
    );
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 360 }),
          withTiming(0, { duration: 360 })
        ),
        -1
      )
    );
  }, [delay, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

interface ChatTypingIndicatorProps {
  label?: string;
}

export function ChatTypingIndicator({ label }: ChatTypingIndicatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Sparkles size={14} color="#EF4444" />
        <View style={styles.content}>
          {label ? <Text style={styles.label}>{label}</Text> : null}
          <View style={styles.dots}>
            <TypingDot delay={0} />
            <TypingDot delay={140} />
            <TypingDot delay={280} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: '80%',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  content: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
});