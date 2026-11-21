import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { makeStyles, useAppTheme } from '@/theme';
import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';
import { AppText } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  /** Stretch to the parent width (default true). */
  block?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/** Pill button. Every size keeps at least a 44 pt touch target. */
export function Button({
  title, onPress, variant = 'primary', size = 'md', icon, disabled, loading, block = true, style, accessibilityLabel, accessibilityHint,
}: ButtonProps) {
  const { colors } = useAppTheme();
  const s = useStyles();
  const off = Boolean(disabled || loading);
  const fg = variant === 'primary' || variant === 'danger' ? colors.onPrimary : variant === 'secondary' ? colors.onPrimarySoft : colors.primary;
  return (
    <PressableScale
      onPress={onPress}
      disabled={off}
      haptic={variant === 'danger' ? 'heavy' : 'light'}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: off, busy: Boolean(loading) }}
      style={[s.base, s[size], s[variant], block && s.block, off && s.disabled, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={s.row}>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 20} color={fg} /> : null}
          <AppText variant={size === 'sm' ? 'captionStrong' : 'bodyStrong'} style={{ color: fg }} numberOfLines={2} center>{title}</AppText>
        </View>
      )}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  base: { borderRadius: t.radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: t.spacing.xl },
  block: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  sm: { minHeight: t.touchTarget, paddingHorizontal: t.spacing.md },
  md: { minHeight: 52 },
  lg: { minHeight: 58 },
  primary: { backgroundColor: t.colors.primaryStrong, ...t.shadows.sm },
  secondary: { backgroundColor: t.colors.primarySoft },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: t.colors.dangerStrong, ...t.shadows.sm },
  disabled: { opacity: 0.45 },
}));
