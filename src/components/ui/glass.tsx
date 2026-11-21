import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/theme';

/**
 * Frosted-glass surface. iOS gets a real blur; Android (Expo Go, no blur target) gets
 * the same translucent tint, which keeps text readable over the map.
 */
export function Glass({ children, style, intensity = 40 }: { children?: ReactNode; style?: StyleProp<ViewStyle>; intensity?: number }) {
  const { colors, isDark } = useAppTheme();
  return (
    <View style={[styles.shell, style]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={intensity} tint={isDark ? 'systemThinMaterialDark' : 'systemThinMaterialLight'} style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ shell: { overflow: 'hidden' } });
