import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { makeStyles, useAppTheme } from '@/theme';
import { AppText } from './text';

const initials = (name?: string) =>
  (name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '•';

/** Round avatar with initials on the brand gradient and a white ring. */
export function Avatar({ name, size = 48, accessibilityLabel }: { name?: string; size?: number; accessibilityLabel?: string }) {
  const { gradients } = useAppTheme();
  const s = useStyles();
  return (
    <View
      style={[s.ring, { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 }]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? name}
    >
      <LinearGradient
        colors={gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.inner, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <AppText variant={size >= 56 ? 'h2' : 'bodyStrong'} tone="onPrimary">{initials(name)}</AppText>
      </LinearGradient>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  ring: { backgroundColor: t.colors.iconButton, alignItems: 'center', justifyContent: 'center', ...t.shadows.sm },
  inner: { alignItems: 'center', justifyContent: 'center' },
}));
