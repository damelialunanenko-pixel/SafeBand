import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Marker } from 'react-native-maps';
import Animated, {
  cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { makeStyles } from '@/theme';

const SIZE = 96;

type Props = { coordinate: { latitude: number; longitude: number }; title: string; alert?: boolean };

/** The ward on the map: a dot with concentric rings pulsing outwards. */
export function WardMarker({ coordinate, title, alert }: Props) {
  const reduceMotion = useReducedMotion();
  const s = useStyles();
  const a = useSharedValue(0);
  const b = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    const loop = () => withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false);
    a.set(loop());
    b.set(withDelay(1100, loop()));
    return () => { cancelAnimation(a); cancelAnimation(b); };
  }, [reduceMotion, a, b]);

  return (
    <Marker
      coordinate={coordinate}
      title={title}
      anchor={{ x: 0.5, y: 0.5 }}
      // Android renders custom markers to a bitmap: keep redrawing only while the rings animate.
      tracksViewChanges={Platform.OS === 'android' && !reduceMotion}
    >
      <View style={s.box}>
        {reduceMotion ? <View style={[s.ring, s.staticRing, alert && s.ringAlert]} /> : (
          <>
            <Ring progress={a} alert={alert} />
            <Ring progress={b} alert={alert} />
          </>
        )}
        <View style={s.halo}>
          <View style={[s.dot, alert && s.dotAlert]} />
        </View>
      </View>
    </Marker>
  );
}

function Ring({ progress, alert }: { progress: SharedValue<number>; alert?: boolean }) {
  const s = useStyles();
  const style = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - progress.get()),
    transform: [{ scale: 0.25 + progress.get() * 0.75 }],
  }));
  return <Animated.View style={[s.ring, alert && s.ringAlert, style]} />;
}

const useStyles = makeStyles((t) => ({
  box: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: SIZE / 2, borderWidth: 2,
    borderColor: t.colors.primary, backgroundColor: t.colors.primarySoft,
  },
  staticRing: { opacity: 0.35, transform: [{ scale: 0.6 }] },
  ringAlert: { borderColor: t.colors.danger, backgroundColor: t.colors.dangerSoft },
  halo: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: t.colors.card,
    alignItems: 'center', justifyContent: 'center', ...t.shadows.md,
  },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: t.colors.primaryStrong },
  dotAlert: { backgroundColor: t.colors.danger },
}));
