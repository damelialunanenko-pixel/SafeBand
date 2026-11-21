import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { makeStyles, useAppTheme } from '@/theme';
import { selectionHaptic } from './haptics';
import { PressableScale } from './pressable-scale';
import { AppText } from './text';

type Segment<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

const PAD = 4;

/** Pill segmented control; the white thumb slides to the selected segment on the UI thread. */
export function SegmentedControl<T extends string>({ segments, value, onChange, accessibilityLabel }: SegmentedControlProps<T>) {
  const { motion } = useAppTheme();
  const s = useStyles();
  const width = useSharedValue(0);
  const index = Math.max(0, segments.findIndex((x) => x.value === value));
  const position = useSharedValue(index);

  useEffect(() => { position.set(withSpring(index, motion.gentleSpring)); }, [index, position, motion]);

  const count = segments.length;
  const thumb = useAnimatedStyle(() => {
    const w = (width.get() - PAD * 2) / count;
    return { width: Math.max(0, w), transform: [{ translateX: position.get() * w }] };
  });

  return (
    <View style={s.track} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} onLayout={(e) => width.set(e.nativeEvent.layout.width)}>
      <Animated.View style={[s.thumb, thumb]} />
      {segments.map((seg) => {
        const on = seg.value === value;
        return (
          <PressableScale
            key={seg.value}
            haptic={false}
            scaleTo={0.97}
            onPress={() => { if (!on) { selectionHaptic(); onChange(seg.value); } }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={seg.label}
            style={s.segment}
          >
            <AppText variant="captionStrong" tone={on ? 'onPrimarySoft' : 'secondary'}>{seg.label}</AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  track: {
    flexDirection: 'row', padding: PAD, borderRadius: t.radius.pill,
    backgroundColor: t.isDark ? t.colors.card : t.colors.primarySoft,
  },
  thumb: {
    position: 'absolute', top: PAD, bottom: PAD, left: PAD, borderRadius: t.radius.pill,
    backgroundColor: t.isDark ? t.colors.primarySoft : t.colors.card, ...t.shadows.sm,
  },
  segment: { flex: 1, minHeight: t.touchTarget, alignItems: 'center', justifyContent: 'center' },
}));
