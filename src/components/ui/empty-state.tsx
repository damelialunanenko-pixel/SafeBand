import { View } from 'react-native';
import { makeStyles } from '@/theme';
import { Button } from './button';
import { IconCircle, type IconName, type IconTone } from './icon';
import { AppText } from './text';

type EmptyStateProps = {
  icon: IconName;
  title: string;
  description?: string;
  tone?: IconTone;
  actionTitle?: string;
  onAction?: () => void;
};

/** Friendly placeholder for empty lists and errors. */
export function EmptyState({ icon, title, description, tone = 'primary', actionTitle, onAction }: EmptyStateProps) {
  const s = useStyles();
  return (
    <View style={s.box} accessible={!onAction} accessibilityLabel={[title, description].filter(Boolean).join('. ')}>
      <IconCircle name={icon} tone={tone} size={64} />
      <AppText variant="title" center>{title}</AppText>
      {description ? <AppText variant="body" tone="muted" center>{description}</AppText> : null}
      {actionTitle && onAction ? <Button title={actionTitle} onPress={onAction} block={false} style={s.action} /> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  box: {
    alignItems: 'center', gap: t.spacing.xs, paddingVertical: t.spacing.xl, paddingHorizontal: t.spacing.lg,
    backgroundColor: t.colors.card, borderRadius: t.radius.lg, ...t.shadows.sm,
  },
  action: { marginTop: t.spacing.sm },
}));
