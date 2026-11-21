import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { motion } from '@/theme';

/**
 * Content that slides up with a fade, staggered by `index` (50 ms per item).
 * Reanimated layout animations follow the system “Reduce motion” setting, so they
 * become instant there.
 */
export function Appear({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 10) * motion.stagger).duration(motion.slow).springify().damping(20).stiffness(180)}
      layout={LinearTransition.duration(motion.base)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
