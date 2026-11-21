import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { makeStyles, useAppTheme } from '@/theme';

type SkeletonProps = { width?: DimensionValue; height?: number; radius?: number; style?: StyleProp<ViewStyle> };

/** Placeholder block with a shimmer sweep (static when “Reduce motion” is on). */
export function Skeleton({ width = '100%', height = 16, radius, style }: SkeletonProps) {
  const { colors, radius: r } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const x = useSharedValue(0);
  const w = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    x.set(withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }), -1, false));
    return () => cancelAnimation(x);
  }, [reduceMotion, x]);

  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: -w.get() + x.get() * w.get() * 2 }] }));

  return (
    <View
      onLayout={(e) => w.set(e.nativeEvent.layout.width)}
      style={[{ width, height, borderRadius: radius ?? r.sm, backgroundColor: colors.skeleton, overflow: 'hidden' }, style]}
    >
      {reduceMotion ? null : (
        <Animated.View style={[StyleSheet.absoluteFill, sweep]}>
          <LinearGradient
            colors={[colors.skeleton, colors.skeletonHighlight, colors.skeleton]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

/** Skeleton shaped like a ListItem. */
export function SkeletonRow() {
  const s = useStyles();
  return (
    <View style={s.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Skeleton width={44} height={44} radius={22} />
      <View style={s.lines}>
        <Skeleton width="70%" height={14} />
        <Skeleton width="45%" height={12} />
      </View>
      <Skeleton width={42} height={12} />
    </View>
  );
}

/** Several skeleton rows with an accessible “loading” label. */
export function SkeletonList({ count = 3, label }: { count?: number; label: string }) {
  const s = useStyles();
  return (
    <View style={s.list} accessible accessibilityLabel={label} accessibilityState={{ busy: true }}>
      {Array.from({ length: count }, (_, i) => <SkeletonRow key={i} />)}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, minHeight: 72, paddingHorizontal: t.spacing.md,
    backgroundColor: t.colors.card, borderRadius: t.radius.lg,
  },
  lines: { flex: 1, gap: t.spacing.xs },
  list: { gap: t.spacing.sm },
}));
