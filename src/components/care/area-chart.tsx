import { useEffect, useId, useMemo, useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { AppText } from '@/components/ui';
import { makeStyles, useAppTheme } from '@/theme';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export type ChartPoint = { t: number; y: number };

type AreaChartProps = {
  points: ChartPoint[];
  height?: number;
  color: string;
  formatValue: (y: number) => string;
  formatTime: (t: number) => string;
  accessibilityLabel: string;
};

const PAD = { top: 16, right: 12, bottom: 26, left: 36 };

/** Catmull-Rom → cubic Bézier: a smooth line through every point. */
function smoothPath(xy: [number, number][]) {
  if (xy.length < 2) return '';
  let d = `M${xy[0][0]},${xy[0][1]}`;
  for (let i = 0; i < xy.length - 1; i++) {
    const p0 = xy[i - 1] ?? xy[i];
    const p1 = xy[i];
    const p2 = xy[i + 1];
    const p3 = xy[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/**
 * Smooth area chart with a gradient fill. It is revealed left-to-right by an animated
 * clip rectangle (UI thread); touching it shows the nearest reading in a tooltip.
 */
export function AreaChart({ points, height = 190, color, formatValue, formatTime, accessibilityLabel }: AreaChartProps) {
  const { colors } = useAppTheme();
  const s = useStyles();
  const id = useId().replace(/:/g, '');
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const reveal = useSharedValue(0);

  const geo = useMemo(() => {
    if (points.length < 2 || width === 0) return null;
    const ys = points.map((p) => p.y);
    let min = Math.min(...ys);
    let max = Math.max(...ys);
    const span = max - min || 1;
    min = Math.floor(min - span * 0.2);
    max = Math.ceil(max + span * 0.2);
    const t0 = points[0].t;
    const t1 = points[points.length - 1].t;
    const w = width - PAD.left - PAD.right;
    const h = height - PAD.top - PAD.bottom;
    const x = (t: number) => PAD.left + (t1 === t0 ? w / 2 : ((t - t0) / (t1 - t0)) * w);
    const y = (v: number) => PAD.top + h - ((v - min) / (max - min)) * h;
    const xy = points.map((p) => [x(p.t), y(p.y)] as [number, number]);
    const line = smoothPath(xy);
    const area = `${line} L${xy[xy.length - 1][0]},${PAD.top + h} L${xy[0][0]},${PAD.top + h} Z`;
    const ticks = [max, (max + min) / 2, min].map((v) => ({ v, y: y(v) }));
    return { xy, line, area, ticks, bottom: PAD.top + h };
  }, [points, width, height]);

  useEffect(() => {
    reveal.set(0);
    reveal.set(withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [geo, reveal]);

  const clipProps = useAnimatedProps(() => ({ width: Math.max(0, width * reveal.get()) }));

  const pick = (e: GestureResponderEvent) => {
    if (!geo) return;
    const tx = e.nativeEvent.locationX;
    let best = 0;
    for (let i = 1; i < geo.xy.length; i++) if (Math.abs(geo.xy[i][0] - tx) < Math.abs(geo.xy[best][0] - tx)) best = i;
    if (best !== active) setActive(best);
  };

  const sel = active !== null && geo ? { p: points[active], xy: geo.xy[active] } : null;
  const tipLeft = sel ? Math.min(Math.max(sel.xy[0] - 60, 0), Math.max(0, width - 120)) : 0;

  return (
    <View
      style={{ height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={pick}
      onResponderMove={pick}
      onResponderRelease={() => setActive(null)}
      onResponderTerminate={() => setActive(null)}
    >
      {geo ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.35} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
            <ClipPath id={`clip-${id}`}>
              <AnimatedRect x={0} y={0} height={height} animatedProps={clipProps} />
            </ClipPath>
          </Defs>
          {geo.ticks.map((tick) => (
            <G key={tick.y}>
              <Line x1={PAD.left} x2={width - PAD.right} y1={tick.y} y2={tick.y} stroke={colors.border} strokeDasharray="4 6" />
            </G>
          ))}
          <G clipPath={`url(#clip-${id})`}>
            <Path d={geo.area} fill={`url(#fill-${id})`} />
            <Path d={geo.line} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" />
          </G>
          {sel ? (
            <G>
              <Line x1={sel.xy[0]} x2={sel.xy[0]} y1={PAD.top} y2={geo.bottom} stroke={color} strokeWidth={1.5} />
              <Circle cx={sel.xy[0]} cy={sel.xy[1]} r={7} fill={colors.card} stroke={color} strokeWidth={3} />
            </G>
          ) : null}
        </Svg>
      ) : null}
      {geo ? geo.ticks.map((tick) => (
        <AppText key={`l${tick.y}`} variant="micro" tone="muted" style={[s.yLabel, { top: tick.y - 7 }]}>{Math.round(tick.v)}</AppText>
      )) : null}
      {geo ? (
        <View style={s.xLabels} pointerEvents="none">
          <AppText variant="micro" tone="muted">{formatTime(points[0].t)}</AppText>
          <AppText variant="micro" tone="muted">{formatTime(points[points.length - 1].t)}</AppText>
        </View>
      ) : null}
      {sel ? (
        <View style={[s.tip, { left: tipLeft }]} pointerEvents="none">
          <AppText variant="captionStrong" tone="onPrimary">{formatValue(sel.p.y)}</AppText>
          <AppText variant="micro" tone="onPrimary">{formatTime(sel.p.t)}</AppText>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  yLabel: { position: 'absolute', left: 0, width: PAD.left - 6, textAlign: 'right' },
  xLabels: { position: 'absolute', left: PAD.left, right: PAD.right, bottom: 4, flexDirection: 'row', justifyContent: 'space-between' },
  tip: {
    position: 'absolute', top: 0, width: 120, alignItems: 'center', paddingVertical: 6, paddingHorizontal: t.spacing.xs,
    borderRadius: t.radius.sm, backgroundColor: t.colors.primaryDeep, ...t.shadows.md,
  },
}));
