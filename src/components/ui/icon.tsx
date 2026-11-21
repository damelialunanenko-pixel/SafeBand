import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme, type ThemeColors } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const { colors } = useAppTheme();
  return <Ionicons name={name} size={size} color={color ?? colors.text} accessibilityElementsHidden importantForAccessibility="no" />;
}

export type IconTone = 'primary' | 'success' | 'warning' | 'danger' | 'lavender' | 'cyan' | 'neutral' | 'white';

/** [background, foreground] for an icon inside a soft coloured circle. */
export function iconToneColors(tone: IconTone, colors: ThemeColors): [string, string] {
  switch (tone) {
    case 'success': return [colors.successSoft, colors.onSuccessSoft];
    case 'warning': return [colors.warningSoft, colors.onWarningSoft];
    case 'danger': return [colors.dangerSoft, colors.onDangerSoft];
    case 'lavender': return [colors.lavenderSoft, colors.onLavenderSoft];
    case 'cyan': return [colors.cyanSoft, colors.onCyanSoft];
    case 'neutral': return [colors.background, colors.textSecondary];
    case 'white': return [colors.iconButton, colors.primary];
    default: return [colors.primarySoft, colors.onPrimarySoft];
  }
}

/** Ionicon centred in a soft coloured circle, as in the reference designs. */
export function IconCircle({ name, tone = 'primary', size = 44, style }: {
  name: IconName; tone?: IconTone; size?: number; style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();
  const [bg, fg] = iconToneColors(tone, colors);
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Icon name={name} size={Math.round(size * 0.5)} color={fg} />
    </View>
  );
}
