/**
 * SafeBand design tokens: palette, light/dark colour roles, spacing, radii, type scale,
 * shadows, gradients and motion. Screens and components read these only through
 * `useAppTheme()` — no hard-coded colours, sizes or radii outside this folder.
 */
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/** Raw palette. Use the semantic roles in `ThemeColors` instead of these in UI code. */
export const palette = {
  blue: '#3B82F6',
  blueStrong: '#2563EB',
  blueDark: '#1D4ED8',
  blueDeep: '#1E3A8A',
  blueLight: '#DBEAFE',
  blueMist: '#BFDBFE',
  blueHaze: '#EFF6FF',
  page: '#F3F7FD',
  sky: '#60A5FA',
  cyan: '#22D3EE',
  lavender: '#A5B4FC',
  green: '#22C55E',
  greenSoft: '#DCFCE7',
  greenText: '#15803D',
  amber: '#F59E0B',
  amberSoft: '#FEF3C7',
  amberText: '#B45309',
  red: '#EF4444',
  redStrong: '#DC2626',
  redSoft: '#FEE2E2',
  redText: '#B91C1C',
  white: '#FFFFFF',
  ink: '#0F1B3D',
  slate: '#3E4C66',
  slateMuted: '#5A6A82',
  line: '#E3EAF5',
  // dark
  night: '#0B1220',
  nightCard: '#111A2E',
  nightRaised: '#18233B',
  nightLine: '#22304D',
  nightText: '#E8EEF9',
  nightTextSecondary: '#B4C0D6',
  nightTextMuted: '#8D9AB3',
} as const;

export type ThemeColors = {
  background: string;
  card: string;
  cardRaised: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  /** Accent for icons, rings, links on light surfaces. */
  primary: string;
  /** Filled primary buttons: one step darker than `primary` so white text passes WCAG AA. */
  primaryStrong: string;
  primaryDark: string;
  primaryDeep: string;
  primarySoft: string;
  /** Text/icons placed on `primarySoft`. */
  onPrimarySoft: string;
  onPrimary: string;
  sky: string;
  cyan: string;
  lavender: string;
  lavenderSoft: string;
  onLavenderSoft: string;
  cyanSoft: string;
  onCyanSoft: string;
  success: string;
  successSoft: string;
  onSuccessSoft: string;
  warning: string;
  warningSoft: string;
  onWarningSoft: string;
  /** SOS / destructive: stays red in both themes. */
  danger: string;
  dangerStrong: string;
  dangerSoft: string;
  onDangerSoft: string;
  /** Round icon buttons: white disc in light theme. */
  iconButton: string;
  placeholder: string;
  overlay: string;
  skeleton: string;
  skeletonHighlight: string;
  shadow: string;
  /** Glass tint used under BlurView. */
  glass: string;
};

export const lightColors: ThemeColors = {
  background: palette.page,
  card: palette.white,
  cardRaised: palette.white,
  border: palette.line,
  text: palette.ink,
  textSecondary: palette.slate,
  textMuted: palette.slateMuted,
  primary: palette.blue,
  primaryStrong: palette.blueStrong,
  primaryDark: palette.blueDark,
  primaryDeep: palette.blueDeep,
  primarySoft: palette.blueLight,
  onPrimarySoft: palette.blueDark,
  onPrimary: palette.white,
  sky: palette.sky,
  cyan: palette.cyan,
  lavender: palette.lavender,
  lavenderSoft: '#EEF0FF',
  onLavenderSoft: '#4F46E5',
  cyanSoft: '#E0F9FD',
  onCyanSoft: '#0E7490',
  success: palette.green,
  successSoft: palette.greenSoft,
  onSuccessSoft: palette.greenText,
  warning: palette.amber,
  warningSoft: palette.amberSoft,
  onWarningSoft: palette.amberText,
  danger: palette.red,
  dangerStrong: palette.redStrong,
  dangerSoft: palette.redSoft,
  onDangerSoft: palette.redText,
  iconButton: palette.white,
  placeholder: '#7C8BA3',
  overlay: 'rgba(15, 27, 61, 0.38)',
  skeleton: '#E6EDF8',
  skeletonHighlight: '#F6F9FE',
  shadow: palette.blueDeep,
  glass: 'rgba(255, 255, 255, 0.72)',
};

export const darkColors: ThemeColors = {
  background: palette.night,
  card: palette.nightCard,
  cardRaised: palette.nightRaised,
  border: palette.nightLine,
  text: palette.nightText,
  textSecondary: palette.nightTextSecondary,
  textMuted: palette.nightTextMuted,
  primary: palette.blue,
  primaryStrong: palette.blueStrong,
  primaryDark: palette.blueDark,
  primaryDeep: palette.blueDeep,
  primarySoft: '#172A52',
  onPrimarySoft: '#93C5FD',
  onPrimary: palette.white,
  sky: palette.sky,
  cyan: palette.cyan,
  lavender: palette.lavender,
  lavenderSoft: '#25284A',
  onLavenderSoft: palette.lavender,
  cyanSoft: '#0E2E38',
  onCyanSoft: palette.cyan,
  success: palette.green,
  successSoft: '#0F2E1F',
  onSuccessSoft: '#4ADE80',
  warning: palette.amber,
  warningSoft: '#33260B',
  onWarningSoft: '#FBBF24',
  danger: palette.red,
  dangerStrong: palette.redStrong,
  dangerSoft: '#3A1519',
  onDangerSoft: '#FCA5A5',
  iconButton: palette.nightRaised,
  placeholder: '#7D8AA3',
  overlay: 'rgba(0, 0, 0, 0.55)',
  skeleton: '#18233B',
  skeletonHighlight: '#22304D',
  shadow: '#000000',
  glass: 'rgba(17, 26, 46, 0.72)',
};

/** `#RRGGBB` + alpha (0–1) → `rgba()`; for translucent fills such as map circles. */
export function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** 4-pt spacing scale. `screen` is the horizontal page padding. */
export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, screen: 20 } as const;

export const radius = { sm: 12, md: 16, lg: 24, xl: 28, pill: 999 } as const;

/** Minimum touch target (WCAG / platform guidelines). */
export const touchTarget = 44;

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

/** Type scale 32 / 24 / 20 / 17 / 15 / 13 / 11. Each variant fixes the font file, so weight works on Android too. */
export const typography = {
  display: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  h1: { fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  title: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  captionStrong: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.4 },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

export type ThemeGradients = {
  header: readonly [string, string];
  headerGlow: readonly [string, string];
  hero: readonly [string, string];
  sos: readonly [string, string];
};

export const lightGradients: ThemeGradients = {
  header: [palette.blueMist, palette.blueHaze],
  headerGlow: ['rgba(96, 165, 250, 0.55)', 'rgba(96, 165, 250, 0)'],
  // Spec asks for #3B82F6 → #60A5FA; white body text on #60A5FA is only 2.5:1, so the
  // gradient starts one step darker and ends at the brand blue (white text ≥ 3.7:1 for large type).
  hero: [palette.blueDark, palette.blue],
  sos: [palette.red, palette.redStrong],
};

export const darkGradients: ThemeGradients = {
  header: ['#16294F', palette.night],
  headerGlow: ['rgba(59, 130, 246, 0.35)', 'rgba(59, 130, 246, 0)'],
  hero: [palette.blueDark, palette.blue],
  sos: [palette.red, palette.redStrong],
};

export type ShadowLevel = 'sm' | 'md' | 'lg';

/** Soft bluish shadows; on Android only `elevation` applies. */
export function makeShadows(color: string, dark: boolean): Record<ShadowLevel, ViewStyle> {
  const opacity = dark ? 0.35 : 0.08;
  const make = (y: number, blur: number, elevation: number): ViewStyle =>
    Platform.select<ViewStyle>({
      android: { elevation: dark ? Math.max(1, elevation - 1) : elevation, shadowColor: color },
      default: { shadowColor: color, shadowOpacity: opacity, shadowRadius: blur, shadowOffset: { width: 0, height: y } },
    });
  return { sm: make(4, 12, 2), md: make(8, 24, 3), lg: make(14, 32, 4) };
}

/** Motion: 250–350 ms transitions, 50 ms stagger, a soft press spring. */
export const motion = {
  fast: 180,
  base: 280,
  slow: 350,
  stagger: 50,
  pressScale: 0.96,
  spring: { damping: 18, stiffness: 260, mass: 0.6 },
  gentleSpring: { damping: 20, stiffness: 160, mass: 0.8 },
} as const;
