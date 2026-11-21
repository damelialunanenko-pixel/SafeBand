import { useEffect, useId, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { makeStyles, useAppTheme } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ProgressRingProps = {
  /** Current value; `null`/`undefined` draws an empty track. */
  value?: number | null;
  max: number;
  min?: number;
  size?: number;
  strokeWidth?: number;
  /** Gradient along the arc: [start, end]. */
  colors?: readonly [string, string];
  children?: ReactNode;
  accessibilityLabel: string;
};

/** Ring that fills to `value` on mount and animates on every change (react-native-svg + Reanimated). */
export function ProgressRing({
  value, max, min = 0, size = 96, strokeWidth = 10, colors: arc, children, accessibilityLabel,
}: ProgressRingProps) {
  const { colors } = useAppTheme();
  const s = useStyles();
  const gradientId = `ring-${useId().replace(/:/g, '')}`;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withTiming(ratio, { duration: 1000, easing: Easing.out(Easing.cubic) }));
  }, [ratio, progress]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - progress.get()) }));
  const [from, to] = arc ?? [colors.primary, colors.cyan];

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: typeof value === 'number' ? value : undefined }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.primarySoft} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={s.center} pointerEvents="none">{children}</View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
}));
