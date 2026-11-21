import type { ReactNode } from 'react';
import { View } from 'react-native';
import { makeStyles, useAppTheme } from '@/theme';
import { Icon, IconCircle, type IconName, type IconTone } from './icon';
import { PressableScale } from './pressable-scale';
import { AppText } from './text';

type ListItemProps = {
  icon: IconName;
  iconTone?: IconTone;
  title: string;
  subtitle?: string;
  /** Right column, e.g. the time. */
  meta?: string;
  /** Right column accent under `meta`. */
  metaAccent?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  /** Critical items get a soft red background. */
  critical?: boolean;
  accessibilityLabel?: string;
};

/** Row like a transaction in the references: icon in a circle + text + time on the right. */
export function ListItem({ icon, iconTone = 'primary', title, subtitle, meta, metaAccent, onPress, chevron, critical, accessibilityLabel }: ListItemProps) {
  const { colors } = useAppTheme();
  const s = useStyles();
  const body = (
    <>
      <IconCircle name={icon} tone={iconTone} />
      <View style={s.text}>
        <AppText variant="bodyStrong" numberOfLines={2}>{title}</AppText>
        {subtitle ? <AppText variant="caption" tone="muted" numberOfLines={2}>{subtitle}</AppText> : null}
      </View>
      {meta || metaAccent ? (
        <View style={s.meta}>
          {meta ? <AppText variant="caption" tone="muted">{meta}</AppText> : null}
          {metaAccent}
        </View>
      ) : null}
      {chevron ? <Icon name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </>
  );
  const label = accessibilityLabel ?? [title, subtitle, meta].filter(Boolean).join(', ');
  if (onPress) {
    return <PressableScale onPress={onPress} scaleTo={0.98} style={[s.row, critical && s.critical]} accessibilityLabel={label}>{body}</PressableScale>;
  }
  return <View style={[s.row, critical && s.critical]} accessible accessibilityLabel={label}>{body}</View>;
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, minHeight: 72,
    paddingHorizontal: t.spacing.md, paddingVertical: t.spacing.sm,
    backgroundColor: t.colors.card, borderRadius: t.radius.lg, ...t.shadows.sm,
  },
  critical: { borderWidth: 1.5, borderColor: t.colors.danger },
  text: { flex: 1, gap: 2 },
  meta: { alignItems: 'flex-end', gap: 4, maxWidth: '35%' },
}));
