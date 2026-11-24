import { Platform, Switch, View } from 'react-native';
import { AppText, Button, Card, IconCircle, useToast } from '@/components/ui';
import { usePrimaryCareData } from '@/hooks/use-care-data';
import { useLocalization } from '@/localization';
import { openSystemSettings, requestPermission, sendTestReminder, setRemindersEnabled, useReminderState } from '@/services/medication-reminders';
import { makeStyles, useAppTheme } from '@/theme';

/** Settings: "Medication reminders" switch and "Test reminder" (a notification in 5 seconds). */
export function MedicationRemindersCard() {
  const { t } = useLocalization();
  const { colors } = useAppTheme();
  const toast = useToast();
  const s = useStyles();
  const { ward } = usePrimaryCareData();
  const { enabled, permission } = useReminderState();

  if (Platform.OS === 'web') return null;

  const toggle = async (on: boolean) => {
    await setRemindersEnabled(on); // the reminder sync in the tabs layout reschedules or cancels
    if (on && permission !== 'granted' && !(await requestPermission())) toast.show(t('medsPermDenied'), 'danger');
  };
  const test = async () => {
    if (await sendTestReminder(t, ward?.name)) toast.show(t('medsTestScheduled'), 'success');
    else toast.show(t('medsPermDenied'), 'danger');
  };

  return (
    <Card style={s.card}>
      <View style={s.head}>
        <IconCircle name="alarm" tone="warning" />
        <AppText variant="title" accessibilityRole="header" style={s.flex}>{t('medsRemindersSetting')}</AppText>
        <Switch
          value={enabled !== false}
          disabled={enabled === undefined}
          onValueChange={(v) => void toggle(v)}
          accessibilityLabel={t('medsRemindersSetting')}
          trackColor={{ true: colors.primaryStrong, false: colors.border }}
          thumbColor={colors.card}
          ios_backgroundColor={colors.border}
        />
      </View>
      <AppText variant="body" tone="secondary">{t('medsRemindersHint')}</AppText>
      {permission === 'denied' ? (
        <>
          <AppText variant="caption" tone="warning">{t('medsPermDenied')}</AppText>
          <Button variant="secondary" size="sm" icon="settings-outline" title={t('medsOpenSettings')} onPress={openSystemSettings} />
        </>
      ) : null}
      <Button variant="secondary" icon="notifications-outline" title={t('medsTestReminder')} onPress={() => void test()} />
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  card: { gap: t.spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
}));
