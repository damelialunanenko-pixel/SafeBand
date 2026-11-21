import { View } from 'react-native';
import { AnimatedNumber, AppText, Card, Icon, ProgressRing, type IconName } from '@/components/ui';
import { makeStyles, useAppTheme } from '@/theme';

type MetricRingProps = {
  label: string;
  unit: string;
  icon: IconName;
  value?: number | null;
  min: number;
  max: number;
  colors: readonly [string, string];
  alert?: boolean;
  onPress?: () => void;
};

/** Small card: animated ring + counting number + label (pulse, SpO₂, battery). */
export function MetricRing({ label, unit, icon, value, min, max, colors: arc, alert, onPress }: MetricRingProps) {
  const { colors } = useAppTheme();
  const s = useStyles();
  const has = typeof value === 'number';
  return (
    <Card
      onPress={onPress}
      tone={alert ? 'danger' : 'default'}
      style={s.card}
      padded={false}
      accessibilityLabel={`${label}: ${has ? `${value} ${unit}` : '—'}`}
    >
      <ProgressRing value={value} min={min} max={max} size={76} strokeWidth={8} colors={arc} accessibilityLabel={label}>
        <AnimatedNumber value={value} variant="title" tone={alert ? 'danger' : 'default'} />
        <AppText variant="micro" tone="muted">{unit}</AppText>
      </ProgressRing>
      <View style={s.label}>
        <Icon name={icon} size={14} color={alert ? colors.onDangerSoft : arc[0]} />
        <AppText variant="captionStrong" tone="secondary" numberOfLines={1}>{label}</AppText>
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  card: { flex: 1, alignItems: 'center', paddingVertical: t.spacing.md, paddingHorizontal: t.spacing.xs, gap: t.spacing.xs, borderRadius: t.radius.lg },
  label: { flexDirection: 'row', alignItems: 'center', gap: 4 },
}));
