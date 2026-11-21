import { useEffect, useMemo, type ReactNode } from 'react';
import { PanResponder, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { PressableScale } from '@/components/ui';
import { makeStyles, useAppTheme } from '@/theme';

type Props = {
  /** Always visible part (handle + summary). */
  peek: ReactNode;
  /** Revealed when expanded. */
  children?: ReactNode;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  toggleLabel: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Bottom card over the map: drag the handle up/down or tap it. The finger position only
 * writes a shared value; the card moves on the UI thread.
 */
export function DraggableCard({ peek, children, expanded, onExpandedChange, toggleLabel, style }: Props) {
  const { motion } = useAppTheme();
  const s = useStyles();
  const full = useSharedValue(0);
  const peekHeight = useSharedValue(0);
  const open = useSharedValue(expanded ? 1 : 0);
  const startOpen = useSharedValue(0);

  useEffect(() => { open.set(withSpring(expanded ? 1 : 0, motion.gentleSpring)); }, [expanded, open, motion]);

  // Recreated only when `expanded` flips, i.e. after a gesture has ended.
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderGrant: () => { startOpen.set(open.get()); },
    onPanResponderMove: (_, g) => {
      const range = Math.max(1, full.get() - peekHeight.get());
      open.set(Math.min(1, Math.max(0, startOpen.get() - g.dy / range)));
    },
    onPanResponderRelease: (_, g) => {
      const next = g.vy < -0.3 || (g.vy <= 0.3 && open.get() > 0.5);
      if (next === expanded) open.set(withSpring(next ? 1 : 0, motion.gentleSpring));
      else onExpandedChange(next);
    },
    onPanResponderTerminate: () => open.set(withSpring(expanded ? 1 : 0, motion.gentleSpring)),
  }), [expanded, onExpandedChange, open, full, peekHeight, startOpen, motion]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - open.get()) * Math.max(0, full.get() - peekHeight.get()) }],
  }));

  return (
    <View style={[s.clip, style]} pointerEvents="box-none">
      <Animated.View style={[s.card, cardStyle]} onLayout={(e) => full.set(e.nativeEvent.layout.height)}>
        <View {...responder.panHandlers} onLayout={(e) => peekHeight.set(e.nativeEvent.layout.height)}>
          <PressableScale
            onPress={() => onExpandedChange(!expanded)}
            haptic="light"
            scaleTo={0.9}
            accessibilityLabel={toggleLabel}
            accessibilityState={{ expanded }}
            style={s.handleHit}
          >
            <View style={s.handle} />
          </PressableScale>
          {peek}
        </View>
        {children}
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  clip: { overflow: 'hidden', paddingTop: t.spacing.md, paddingHorizontal: t.spacing.xs },
  card: {
    backgroundColor: t.colors.card, borderRadius: t.radius.xl, paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.lg, ...t.shadows.lg,
  },
  handleHit: { alignSelf: 'center', minHeight: t.touchTarget, minWidth: 88, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: t.colors.border },
}));
