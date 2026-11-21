import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { AppText, Icon, PressableScale } from '@/components/ui';
import { makeStyles, useAppTheme } from '@/theme';

type SosButtonProps = { active: boolean; label: string; hint?: string; onPress: () => void };

/** Large red SOS pill. Strong haptic on press; a red glow pulses while SOS is active. */
export function SosButton({ active, label, hint, onPress }: SosButtonProps) {
  const { gradients, colors } = useAppTheme();
  const s = useStyles();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!active || reduceMotion) { cancelAnimation(pulse); pulse.set(0); return; }
    pulse.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false));
    return () => cancelAnimation(pulse);
  }, [active, reduceMotion, pulse]);

  const glow = useAnimatedStyle(() => ({
    opacity: active ? 0.55 * (1 - pulse.get()) : 0,
    transform: [{ scaleX: 1 + pulse.get() * 0.18 }, { scaleY: 1 + pulse.get() * 0.45 }],
  }));

  return (
    <View style={s.wrap}>
      <Animated.View style={[StyleSheet.absoluteFill, s.glow, glow]} pointerEvents="none" />
      <PressableScale onPress={onPress} haptic="heavy" accessibilityLabel={label} accessibilityHint={hint} accessibilityState={{ selected: active }} style={s.button}>
        <LinearGradient colors={gradients.sos} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, s.radius]} />
        <Icon name={active ? 'close-circle' : 'alert-circle'} size={22} color={colors.onPrimary} />
        <AppText variant="h2" tone="onPrimary">{label}</AppText>
      </PressableScale>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { borderRadius: t.radius.pill },
  glow: { borderRadius: t.radius.pill, backgroundColor: t.colors.danger },
  radius: { borderRadius: t.radius.pill },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.spacing.xs,
    minHeight: 56, minWidth: 112, paddingHorizontal: t.spacing.lg, borderRadius: t.radius.pill, overflow: 'hidden',
    ...t.shadows.md, shadowColor: t.colors.danger,
  },
}));
