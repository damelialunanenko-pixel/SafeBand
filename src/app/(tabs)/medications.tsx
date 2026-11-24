import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import {
  Appear, AppText, Button, Card, Chip, EmptyState, GradientHeader, IconButton, IconCircle, ScreenScroll, SectionHeader,
  SkeletonList, TopBar, useToast, type IconTone,
} from '@/components/ui';
import { usePrimaryCareData } from '@/hooks/use-care-data';
import { useMedications } from '@/hooks/use-medications';
import { useLocalization } from '@/localization';
import {
  ALL_DAYS, LOW_STOCK, WEEKDAYS, WEEK_ORDER, doseState, dosesOnDay, isLowStock, nextDose, weekStats, type Dose, type DoseState,
} from '@/services/medication-schedule';
import { deleteMedication, markDose, setMedicationEnabled } from '@/services/medications';
import { useSession } from '@/services/session';
import { isoToDateInput } from '@/services/validation';
import { makeStyles, useAppTheme } from '@/theme';
import type { Medication } from '@/types/care';

const MEAL_KEYS = { before: 'mealBefore', with: 'mealWith', after: 'mealAfter', any: 'mealAny' } as const;
const STATE_UI: Record<DoseState, { key: string; tone: IconTone; icon: 'checkmark-circle' | 'play-skip-forward' | 'alert-circle' | 'alarm' | 'time-outline' }> = {
  taken: { key: 'medsStateTaken', tone: 'success', icon: 'checkmark-circle' },
  skipped: { key: 'medsStateSkipped', tone: 'neutral', icon: 'play-skip-forward' },
  missed: { key: 'medsStateMissed', tone: 'danger', icon: 'alert-circle' },
  due: { key: 'medsStateDue', tone: 'warning', icon: 'alarm' },
  upcoming: { key: 'medsStateUpcoming', tone: 'primary', icon: 'time-outline' },
};

const sameDays = (a: number[], b: number[]) => a.length === b.length && b.every((d) => a.includes(d));

export default function MedicationsScreen() {
  const { t } = useLocalization();
  const { colors } = useAppTheme();
  const s = useStyles();
  const router = useRouter();
  const toast = useToast();
  const { user } = useSession();
  const { ward, loading: wardLoading } = usePrimaryCareData();
  const { meds, logsByKey, loading, error } = useMedications(ward?.id);
  const [now, setNow] = useState(() => new Date());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const today = useMemo(() => dosesOnDay(meds, now), [meds, now]);
  const next = useMemo(() => nextDose(meds, logsByKey, now), [meds, logsByKey, now]);
  const stats = useMemo(() => weekStats(meds, logsByKey, now), [meds, logsByKey, now]);

  const mark = async (dose: Dose, status: 'taken' | 'skipped') => {
    if (!ward || !user) return;
    setBusy(dose.key);
    try {
      const result = await markDose(ward.id, dose.medication.id, dose.scheduledAt, status, user.uid);
      if (result.stockDecreased && result.stock !== null && result.stock <= LOW_STOCK) toast.show(t('notifLowStockBody', { name: result.name, n: result.stock }), 'danger');
    } catch {
      toast.show(t('medsMarkError'), 'danger');
    } finally {
      setBusy(null);
    }
  };

  const remove = (med: Medication) => Alert.alert(t('medsDeleteTitle'), t('medsDeleteBody', { name: med.name }), [
    { text: t('cancel'), style: 'cancel' },
    {
      text: t('medsDelete'), style: 'destructive',
      onPress: () => { if (ward) deleteMedication(ward.id, med.id).then(() => toast.show(t('medsDeleted'), 'success')).catch(() => toast.show(t('medsSaveError'), 'danger')); },
    },
  ]);

  const addButton = <IconButton icon="add" variant="primary" accessibilityLabel={t('medsAdd')} onPress={() => router.push('/medication-form' as Href)} disabled={!ward} />;
  const header = <GradientHeader><TopBar title={t('medsTitle')} back={false} right={ward && meds.length ? addButton : undefined} /></GradientHeader>;

  if (wardLoading || loading) return <ScreenScroll tabbed header={header}><SkeletonList count={4} label={t('loading')} /></ScreenScroll>;
  if (!ward) {
    return (
      <ScreenScroll tabbed header={header}>
        <EmptyState icon="person-add" title={t('medsTitle')} description={t('addPersonPrompt')} actionTitle={t('addPerson')} onAction={() => router.push('/ward')} />
      </ScreenScroll>
    );
  }

  const schedule = (m: Medication) => {
    const days = m.days?.length ? m.days : ALL_DAYS;
    const dayText = sameDays(days, ALL_DAYS) ? t('medsEveryDay') : sameDays(days, WEEKDAYS) ? t('medsWeekdays') : WEEK_ORDER.filter((d) => days.includes(d)).map((d) => t(`wd${d}`)).join(', ');
    return [m.times.join(', '), dayText, m.startDate ? t('medsFrom', { date: isoToDateInput(m.startDate) }) : '', m.endDate ? t('medsUntil', { date: isoToDateInput(m.endDate) }) : ''].filter(Boolean).join(' · ');
  };

  return (
    <ScreenScroll tabbed header={header}>
      {error ? <Card tone="danger"><AppText tone="danger">{t('medsError')}</AppText></Card> : null}

      {!meds.length ? (
        <Appear index={1}>
          <EmptyState icon="medkit" title={t('medsEmptyTitle')} description={t('medsEmptyBody')} actionTitle={t('medsAdd')} onAction={() => router.push('/medication-form' as Href)} />
        </Appear>
      ) : (
        <>
          <Appear index={1}><SectionHeader title={t('medsToday')} /></Appear>
          {today.length ? today.map((dose, i) => {
            const state = doseState(dose, logsByKey[dose.key], now);
            const ui = STATE_UI[state];
            const isNext = next?.key === dose.key;
            const done = state === 'taken' || state === 'skipped';
            const med = dose.medication;
            return (
              <Appear key={dose.key} index={2 + i}>
                <Card style={[s.dose, isNext && s.doseNext, done && s.doseDone]} accessibilityLabel={`${dose.time} ${med.name} ${t(ui.key)}`}>
                  <View style={s.doseHead}>
                    <AppText variant="h2" tone={isNext ? 'primary' : done ? 'muted' : 'default'}>{dose.time}</AppText>
                    <View style={s.flex}>
                      <AppText variant="bodyStrong">{[med.name, med.dose].filter(Boolean).join(' ')}</AppText>
                      {med.mealRelation !== 'any' ? <AppText variant="caption" tone="secondary">{t(MEAL_KEYS[med.mealRelation])}</AppText> : null}
                    </View>
                    <Chip label={isNext && !done ? t('medsStateNext') : t(ui.key)} tone={isNext && !done ? 'primary' : ui.tone} icon={ui.icon} />
                  </View>
                  {!done ? (
                    <View style={s.actions}>
                      <View style={s.flex}><Button size="sm" icon="checkmark" title={t('medsMarkTaken')} onPress={() => void mark(dose, 'taken')} loading={busy === dose.key} block /></View>
                      <View style={s.flex}><Button size="sm" variant="secondary" title={t('medsMarkSkip')} onPress={() => void mark(dose, 'skipped')} disabled={busy === dose.key} block /></View>
                    </View>
                  ) : null}
                </Card>
              </Appear>
            );
          }) : <Card><AppText tone="secondary">{t('medsNoDosesToday')}</AppText></Card>}

          <Appear index={3 + today.length}><SectionHeader title={t('medsAll')} action={t('medsAdd')} onAction={() => router.push('/medication-form' as Href)} /></Appear>
          {meds.map((med, i) => (
            <Appear key={med.id} index={4 + today.length + i}>
              <Card style={[s.gap, !med.enabled && s.doseDone]}>
                <View style={s.doseHead}>
                  <IconCircle name="medkit" tone={med.enabled ? 'lavender' : 'neutral'} />
                  <View style={s.flex}>
                    <AppText variant="bodyStrong">{[med.name, med.dose].filter(Boolean).join(' ')}</AppText>
                    <AppText variant="caption" tone="secondary">{schedule(med)}</AppText>
                  </View>
                  <Switch
                    value={med.enabled}
                    onValueChange={(v) => void setMedicationEnabled(ward.id, med.id, v).catch(() => toast.show(t('medsSaveError'), 'danger'))}
                    accessibilityLabel={t('medsEnabledA11y', { name: med.name })}
                    trackColor={{ true: colors.primaryStrong, false: colors.border }}
                    thumbColor={colors.card}
                    ios_backgroundColor={colors.border}
                  />
                </View>
                <View style={s.chips}>
                  {!med.enabled ? <Chip label={t('medsOff')} tone="neutral" icon="pause-circle" /> : null}
                  {typeof med.stock === 'number' ? (
                    <Chip label={isLowStock(med) ? t('medsLowStock', { n: med.stock }) : t('medsStock', { n: med.stock })} tone={isLowStock(med) ? 'warning' : 'neutral'} icon="layers-outline" />
                  ) : null}
                  {med.note ? <AppText variant="caption" tone="muted" style={s.flex}>{med.note}</AppText> : null}
                </View>
                <View style={s.actions}>
                  <View style={s.flex}><Button size="sm" variant="secondary" icon="create-outline" title={t('medsEdit')} onPress={() => router.push(`/medication-form?id=${encodeURIComponent(med.id)}` as Href)} block /></View>
                  <View style={s.flex}><Button size="sm" variant="ghost" icon="trash-outline" title={t('medsDelete')} onPress={() => remove(med)} block /></View>
                </View>
              </Card>
            </Appear>
          ))}

          <Appear index={5 + today.length + meds.length}><SectionHeader title={t('medsHistory')} /></Appear>
          <Appear index={6 + today.length + meds.length}>
            <Card style={s.gap}>
              {stats.total ? (
                <>
                  <View style={s.stats}>
                    <Stat value={stats.taken} label={t('medsStatTaken')} tone="success" />
                    <Stat value={stats.skipped} label={t('medsStatSkipped')} tone="secondary" />
                    <Stat value={stats.missed} label={t('medsStatMissed')} tone="danger" />
                  </View>
                  <View style={s.bar} accessibilityElementsHidden>
                    <View style={{ flex: stats.taken, backgroundColor: colors.success }} />
                    <View style={{ flex: stats.skipped, backgroundColor: colors.textMuted }} />
                    <View style={{ flex: stats.missed, backgroundColor: colors.danger }} />
                  </View>
                  <AppText variant="caption" tone="secondary">{t('medsAdherence', { p: Math.round((stats.taken / stats.total) * 100) })}</AppText>
                </>
              ) : <AppText tone="secondary">{t('medsNoHistory')}</AppText>}
            </Card>
          </Appear>
        </>
      )}
    </ScreenScroll>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone: 'success' | 'secondary' | 'danger' }) {
  const s = useStyles();
  return (
    <View style={s.stat}>
      <AppText variant="h1" tone={tone}>{value}</AppText>
      <AppText variant="caption" tone="secondary">{label}</AppText>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  gap: { gap: t.spacing.sm },
  dose: { gap: t.spacing.sm },
  doseNext: { borderWidth: 2, borderColor: t.colors.primary },
  doseDone: { opacity: 0.7 },
  doseHead: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  actions: { flexDirection: 'row', gap: t.spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.spacing.xs },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  bar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: t.colors.border },
}));
