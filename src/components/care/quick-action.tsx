import { View } from 'react-native';
import { AppText, Icon, iconToneColors, PressableScale, type IconName, type IconTone } from '@/components/ui';
import { makeStyles, useAppTheme } from '@/theme';

/** Pill with an icon in a white circle on a soft tinted background (the “Services” row in the references). */
export function QuickAction({ icon, label, tone, onPress, disabled }: {
  icon: IconName; label: string; tone: IconTone; onPress: () => void; disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  const s = useStyles();
  const [bg, fg] = iconToneColors(tone, colors);
  return (
    <PressableScale onPress={onPress} disabled={disabled} accessibilityLabel={label} style={[s.pill, { backgroundColor: bg }, disabled && s.disabled]}>
      <View style={s.circle}>
        <Icon name={icon} size={20} color={fg} />
      </View>
      <AppText variant="bodyStrong">{label}</AppText>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, minHeight: 56,
    paddingLeft: t.spacing.xs, paddingRight: t.spacing.lg, borderRadius: t.radius.pill,
  },
  circle: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.colors.iconButton, ...t.shadows.sm,
  },
  disabled: { opacity: 0.45 },
}));
