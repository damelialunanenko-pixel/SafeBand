import {
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { StyleSheet, useColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import {
  darkColors, darkGradients, lightColors, lightGradients, makeShadows, motion, radius, spacing, touchTarget, typography,
  type ShadowLevel, type ThemeColors, type ThemeGradients,
} from './tokens';

/** Font files for `useFonts()` in the root layout. Names match `fonts` in tokens.ts. */
export const fontAssets = {
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
};

export type AppTheme = {
  scheme: 'light' | 'dark';
  isDark: boolean;
  colors: ThemeColors;
  gradients: ThemeGradients;
  shadows: Record<ShadowLevel, ReturnType<typeof makeShadows>[ShadowLevel]>;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  motion: typeof motion;
  touchTarget: number;
};

function buildTheme(scheme: 'light' | 'dark'): AppTheme {
  const isDark = scheme === 'dark';
  const colors = isDark ? darkColors : lightColors;
  return {
    scheme, isDark, colors,
    gradients: isDark ? darkGradients : lightGradients,
    shadows: makeShadows(colors.shadow, isDark),
    spacing, radius, typography, motion, touchTarget,
  };
}

const themes = { light: buildTheme('light'), dark: buildTheme('dark') };
const ThemeContext = createContext<AppTheme>(themes.light);

/** Follows the system light/dark setting. */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return <ThemeContext.Provider value={themes[scheme]}>{children}</ThemeContext.Provider>;
}

export const useAppTheme = () => useContext(ThemeContext);

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

/**
 * Theme-aware StyleSheet factory, created once per scheme:
 *   const useStyles = makeStyles((t) => ({ card: { backgroundColor: t.colors.card } }));
 *   const s = useStyles();
 */
export function makeStyles<T extends NamedStyles>(factory: (theme: AppTheme) => T) {
  const cache: Partial<Record<'light' | 'dark', T>> = {};
  return function useStyles(): T {
    const theme = useAppTheme();
    return useMemo(() => (cache[theme.scheme] ??= StyleSheet.create(factory(theme))), [theme]);
  };
}
