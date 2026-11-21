import { View } from 'react-native';
import { makeStyles } from '@/theme';
import { PressableScale } from './pressable-scale';
import { AppText } from './text';

/** «Последние события» + «Все». */
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const s = useStyles();
  return (
    <View style={s.row}>
      <AppText variant="h2" accessibilityRole="header" style={s.title}>{title}</AppText>
      {action && onAction ? (
        <PressableScale onPress={onAction} style={s.action} accessibilityLabel={`${title}: ${action}`}>
          <AppText variant="captionStrong" tone="primary">{action}</AppText>
        </PressableScale>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: t.spacing.xs },
  title: { flex: 1 },
  action: { minHeight: t.touchTarget, minWidth: t.touchTarget, justifyContent: 'center', alignItems: 'flex-end', paddingLeft: t.spacing.sm },
}));
