import { View, type StyleProp, type ViewStyle } from 'react-native';
import { makeStyles, useAppTheme } from '@/theme';
import { Glass } from './glass';
import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';

type IconButtonProps = {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** `surface`: white disc; `glass`: frosted (over maps); `primary`: filled blue; `soft`: light blue. */
  variant?: 'surface' | 'glass' | 'primary' | 'soft';
  size?: number;
  /** Red dot in the corner (unread). */
  badge?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Round 44×44 icon button. */
export function IconButton({
  icon, onPress, accessibilityLabel, accessibilityHint, variant = 'surface', size, badge, disabled, style,
}: IconButtonProps) {
  const { colors, touchTarget } = useAppTheme();
  const s = useStyles();
  const d = Math.max(size ?? touchTarget, touchTarget);
  const shape = { width: d, height: d, borderRadius: d / 2 };
  const fg = variant === 'primary' ? colors.onPrimary : variant === 'soft' ? colors.onPrimarySoft : colors.text;
  const inner = (
    <>
      <Icon name={icon} size={Math.round(d * 0.45)} color={fg} />
      {badge ? <View style={s.badge} /> : null}
    </>
  );
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      hitSlop={4}
      style={[shape, variant !== 'glass' && s.shadow, style]}
    >
      {variant === 'glass' ? (
        <Glass style={[shape, s.center]}>{inner}</Glass>
      ) : (
        <View style={[shape, s.center, s[variant]]}>{inner}</View>
      )}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  center: { alignItems: 'center', justifyContent: 'center' },
  shadow: t.shadows.sm,
  surface: { backgroundColor: t.colors.iconButton },
  primary: { backgroundColor: t.colors.primaryStrong },
  soft: { backgroundColor: t.colors.primarySoft },
  glass: {},
  badge: {
    position: 'absolute', top: 10, right: 11, width: 9, height: 9, borderRadius: 5,
    backgroundColor: t.colors.danger, borderWidth: 1.5, borderColor: t.colors.iconButton,
  },
}));
