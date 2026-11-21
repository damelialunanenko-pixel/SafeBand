import { View, type StyleProp, type ViewStyle } from 'react-native';
import { makeStyles, useAppTheme } from '@/theme';
import { Icon, iconToneColors, type IconName, type IconTone } from './icon';
import { PressableScale } from './pressable-scale';
import { AppText } from './text';

type ChipProps = {
  label: string;
  tone?: IconTone;
  icon?: IconName;
  /** Tag on a dark/gradient surface: translucent white. */
  onGradient?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Status tag on a soft coloured background: «Безопасно», «В пути», «Внимание». */
export function Chip({ label, tone = 'primary', icon, onGradient, style }: ChipProps) {
  const { colors } = useAppTheme();
  const s = useStyles();
  const [bg, fg] = onGradient ? [colors.glass, colors.text] : iconToneColors(tone, colors);
  return (
    <View style={[s.chip, { backgroundColor: bg }, style]} accessibilityRole="text" accessibilityLabel={label}>
      {icon ? <Icon name={icon} size={14} color={fg} /> : <View style={[s.dot, { backgroundColor: fg }]} />}
      <AppText variant="captionStrong" style={{ color: fg }}>{label}</AppText>
    </View>
  );
}

type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
};

/** Selectable pill used for filters (history categories, radius presets). */
export function FilterChip({ label, selected, onPress, icon }: FilterChipProps) {
  const { colors } = useAppTheme();
  const s = useStyles();
  const fg = selected ? colors.onPrimary : colors.textSecondary;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[s.filter, selected ? s.filterOn : s.filterOff]}
    >
      {icon ? <Icon name={icon} size={16} color={fg} /> : null}
      <AppText variant="captionStrong" style={{ color: fg }}>{label}</AppText>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  chip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    paddingHorizontal: t.spacing.sm, paddingVertical: 6, borderRadius: t.radius.pill,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  filter: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: t.touchTarget,
    paddingHorizontal: t.spacing.md, borderRadius: t.radius.pill,
  },
  filterOn: { backgroundColor: t.colors.primaryStrong, ...t.shadows.sm },
  filterOff: { backgroundColor: t.colors.card, borderWidth: 1, borderColor: t.colors.border },
}));
