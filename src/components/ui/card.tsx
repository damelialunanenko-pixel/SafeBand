import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { makeStyles, useAppTheme } from '@/theme';
import { PressableScale } from './pressable-scale';

type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** Coloured outline for warning / critical states. */
  tone?: 'default' | 'warning' | 'danger';
  padded?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/** White rounded card with a soft bluish shadow. Becomes pressable (scale + haptic) with `onPress`. */
export function Card({ children, style, onPress, tone = 'default', padded = true, accessibilityLabel, accessibilityHint }: CardProps) {
  const s = useStyles();
  const content = [s.card, padded && s.padded, tone === 'warning' && s.warning, tone === 'danger' && s.danger, style];
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={content} accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint} scaleTo={0.98}>
        {children}
      </PressableScale>
    );
  }
  return <View style={content} accessibilityLabel={accessibilityLabel}>{children}</View>;
}

/** Hero card with the brand blue gradient and soft decorative glows. */
export function GradientCard({ children, style, colors: override }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; colors?: readonly [string, string];
}) {
  const { gradients } = useAppTheme();
  const s = useStyles();
  return (
    <View style={[s.gradientShell, style]}>
      <LinearGradient colors={override ?? gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[s.glow, s.glowTop]} pointerEvents="none" />
      <View style={[s.glow, s.glowBottom]} pointerEvents="none" />
      <View style={s.gradientContent}>{children}</View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: { backgroundColor: t.colors.card, borderRadius: t.radius.lg, ...t.shadows.md },
  padded: { padding: t.spacing.lg },
  warning: { borderWidth: 1.5, borderColor: t.colors.warning },
  danger: { borderWidth: 1.5, borderColor: t.colors.danger, backgroundColor: t.isDark ? t.colors.card : t.colors.dangerSoft },
  gradientShell: { borderRadius: t.radius.xl, overflow: 'hidden', ...t.shadows.lg },
  gradientContent: { padding: t.spacing.lg },
  glow: { position: 'absolute', borderRadius: t.radius.pill },
  glowTop: { width: 220, height: 220, right: -70, top: -90, backgroundColor: t.colors.sky, opacity: 0.35 },
  glowBottom: { width: 160, height: 160, left: -60, bottom: -80, backgroundColor: t.colors.cyan, opacity: 0.18 },
}));
