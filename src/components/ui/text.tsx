import { Text, type TextProps } from 'react-native';
import { useAppTheme, type ThemeColors, type TypographyVariant } from '@/theme';

export type TextTone =
  | 'default' | 'secondary' | 'muted' | 'primary' | 'onPrimary' | 'onPrimarySoft'
  | 'success' | 'warning' | 'danger';

const TONES: Record<TextTone, keyof ThemeColors> = {
  default: 'text',
  secondary: 'textSecondary',
  muted: 'textMuted',
  primary: 'onPrimarySoft',
  onPrimary: 'onPrimary',
  onPrimarySoft: 'onPrimarySoft',
  success: 'onSuccessSoft',
  warning: 'onWarningSoft',
  danger: 'onDangerSoft',
};

/** Resolves a text tone to its colour. */
export const toneColor = (tone: TextTone, colors: ThemeColors) => colors[TONES[tone]];

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  tone?: TextTone;
  center?: boolean;
};

/** Text with the Manrope type scale and a semantic colour. */
export function AppText({ variant = 'body', tone = 'default', center, style, ...rest }: AppTextProps) {
  const { typography, colors } = useAppTheme();
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[typography[variant], { color: colors[TONES[tone]] }, center && { textAlign: 'center' }, style]}
    />
  );
}
