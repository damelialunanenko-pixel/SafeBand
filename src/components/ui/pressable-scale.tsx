import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { useAppTheme } from '@/theme';
import { heavyHaptic, tapHaptic } from './haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Target scale while pressed (default 0.96). */
  scaleTo?: number;
  /** Haptic feedback on press. */
  haptic?: 'light' | 'heavy' | false;
};

/** Pressable that springs down to 96 % on the UI thread and gives a light haptic tap. */
export function PressableScale({
  style, scaleTo, haptic = 'light', onPressIn, onPressOut, onPress, disabled, children, ...rest
}: PressableScaleProps) {
  const { motion } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const pressIn = (e: GestureResponderEvent) => {
    if (!reduceMotion) scale.set(withSpring(scaleTo ?? motion.pressScale, motion.spring));
    onPressIn?.(e);
  };
  const pressOut = (e: GestureResponderEvent) => {
    if (!reduceMotion) scale.set(withSpring(1, motion.spring));
    onPressOut?.(e);
  };
  const press = (e: GestureResponderEvent) => {
    if (haptic === 'heavy') heavyHaptic();
    else if (haptic === 'light') tapHaptic();
    onPress?.(e);
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      disabled={disabled}
      accessibilityState={{ disabled: Boolean(disabled), ...rest.accessibilityState }}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={onPress ? press : undefined}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
