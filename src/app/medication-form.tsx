import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { Button, Field, FormMessage, FormSkeleton, Hint, Screen, SectionTitle, SelectField, SwitchRow, Title, useTouched } from '@/components/form';
import { AppText, Card, FilterChip, IconButton, SegmentedControl } from '@/components/ui';
import type { Option } from '@/config/security-questions';
import { usePrimaryCareData } from '@/hooks/use-care-data';
import { useMedications } from '@/hooks/use-medications';
import { useLocalization } from '@/localization';
import {
  ALL_DAYS, MEAL_RELATIONS, MEDICATION_FORMS, WEEKDAYS, WEEK_ORDER, emptyMedicationForm, isValidTime, medicationToDoc, sortTimes,
  timeOf, validateMedicationForm, type MedicationFormState,
} from '@/services/medication-schedule';
import { saveMedication } from '@/services/medications';
import { isValid, isoToDateInput, formatDateInput } from '@/services/validation';
import { makeStyles } from '@/theme';
import type { Medication } from '@/types/care';

const FORM_KEYS: Record<string, string> = {
  tablet: 'formTablet', capsule: 'formCapsule', drops: 'formDrops', syrup: 'formSyrup', injection: 'formInjection',
  ointment: 'formOintment', inhaler: 'formInhaler', other: 'formOther',
};
const MEAL_LABEL_KEYS: Record<string, string> = { before: 'mealBefore', with: 'mealWith', after: 'mealAfter', any: 'mealAnyLabel' };
type DaysMode = 'all' | 'weekdays' | 'custom';

const sameDays = (a: number[], b: number[]) => a.length === b.length && b.every((d) => a.includes(d));
const daysMode = (days: number[]): DaysMode => (sameDays(days, ALL_DAYS) ? 'all' : sameDays(days, WEEKDAYS) ? 'weekdays' : 'custom');

const toForm = (m: Medication): MedicationFormState => ({
  name: m.name, dose: m.dose ?? '', form: m.form, times: sortTimes(m.times ?? []), days: m.days?.length ? m.days : [...ALL_DAYS],
  startDate: m.startDate ? isoToDateInput(m.startDate) : '', endDate: m.endDate ? isoToDateInput(m.endDate) : '',
  mealRelation: m.mealRelation, note: m.note ?? '', stock: typeof m.stock === 'number' ? String(m.stock) : '', enabled: m.enabled !== false,
});

/** Add / edit a medication: wards/{wardId}/medications/{id}. */
export default function MedicationFormScreen() {
  const { t } = useLocalization();
  const router = useRouter();
  const s = useStyles();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { ward } = usePrimaryCareData();
  const { meds, loading } = useMedications(ward?.id);
  const existing = id ? meds.find((m) => m.id === id) : undefined;

  // Filled from Firestore once when editing; afterwards the form owns the state.
  const [draft, setDraft] = useState<MedicationFormState | null>(null);
  const f = draft ?? (existing ? toForm(existing) : emptyMedicationForm());
  const set = <K extends keyof MedicationFormState>(key: K, value: MedicationFormState[K]) => setDraft({ ...f, [key]: value });

  const { touch, shown, touchAll } = useTouched<keyof MedicationFormState>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [iosTime, setIosTime] = useState(() => new Date(new Date().setHours(8, 0, 0, 0)));
  const [webTime, setWebTime] = useState('');
  const [mode, setMode] = useState<DaysMode | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = validateMedicationForm(f);
  const currentMode = mode ?? daysMode(f.days);

  const options = (ids: string[], keys: Record<string, string>): Option[] =>
    ids.map((x) => { const label = t(keys[x]); return { id: x, label: { ru: label, en: label, kk: label } }; });

  const addTime = (time: string) => {
    touch('times');
    // Duplicates are rejected by validation; keep them visible so the error explains what happened.
    setDraft({ ...f, times: sortTimes([...f.times, time]) });
  };
  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: new Date(new Date().setHours(8, 0, 0, 0)), mode: 'time', is24Hour: true,
        onChange: (e: DateTimePickerEvent, date?: Date) => { if (e.type === 'set' && date) addTime(timeOf(date)); },
      });
    } else setPickerOpen(true);
  };

  const save = async () => {
    if (!ward) return;
    if (!isValid(errors)) return touchAll(Object.keys(errors) as (keyof MedicationFormState)[]);
    setSaving(true); setError(null);
    try {
      await saveMedication(ward.id, existing?.id, medicationToDoc(f));
      router.back();
    } catch {
      setError('medsSaveError');
    } finally {
      setSaving(false);
    }
  };

  if (id && loading) return <Screen scroll={false}><FormSkeleton label={t('loading')} /></Screen>;

  return (
    <Screen>
      <Title>{existing ? t('medFormEdit') : t('medFormNew')}</Title>

      <Field icon="medkit-outline" label={t('medName')} value={f.name} onChangeText={(v) => set('name', v)} onTouched={() => touch('name')}
        error={shown('name', errors.name)} placeholder={t('medNamePlaceholder')} autoCapitalize="sentences" maxLength={60} />
      <Field label={t('medDose')} value={f.dose} onChangeText={(v) => set('dose', v)} onTouched={() => touch('dose')}
        error={shown('dose', errors.dose)} placeholder={t('medDosePlaceholder')} maxLength={30} />
      <SelectField label={t('medFormLabel')} value={f.form} options={options(MEDICATION_FORMS, FORM_KEYS)} onChange={(v) => set('form', v)}
        onTouched={() => touch('form')} error={shown('form', errors.form)} />

      <SectionTitle>{t('medTimes')}</SectionTitle>
      <Hint>{t('medTimesHint')}</Hint>
      <View style={s.times}>
        {f.times.map((time, i) => (
          <View key={`${time}-${i}`} style={s.timeChip}>
            <AppText variant="bodyStrong">{time}</AppText>
            <IconButton icon="close" size={32} variant="soft" accessibilityLabel={t('medRemoveTime', { time })}
              onPress={() => { touch('times'); setDraft({ ...f, times: f.times.filter((_, j) => j !== i) }); }} />
          </View>
        ))}
      </View>
      {Platform.OS === 'web' ? (
        <View style={s.webRow}>
          <View style={s.flex}>
            <Field label={t('medTimes')} value={webTime} onChangeText={setWebTime} placeholder={t('medTimePlaceholder')} maxLength={5} />
          </View>
          <Button variant="secondary" title={t('medAddTime')} disabled={!isValidTime(webTime)} onPress={() => { addTime(webTime); setWebTime(''); }} />
        </View>
      ) : pickerOpen ? (
        <Card style={s.picker}>
          <DateTimePicker value={iosTime} mode="time" display="spinner" is24Hour onChange={(_, date) => date && setIosTime(date)} />
          <Button title={t('medDone')} onPress={() => { addTime(timeOf(iosTime)); setPickerOpen(false); }} />
          <Button variant="link" title={t('cancel')} onPress={() => setPickerOpen(false)} />
        </Card>
      ) : (
        <Button variant="secondary" icon="add" title={t('medAddTime')} onPress={openPicker} />
      )}
      {shown('times', errors.times) ? <FormMessage>{t(errors.times!)}</FormMessage> : null}

      <SectionTitle>{t('medDays')}</SectionTitle>
      <SegmentedControl
        accessibilityLabel={t('medDays')}
        segments={[{ value: 'all', label: t('medsEveryDay') }, { value: 'weekdays', label: t('medsWeekdays') }, { value: 'custom', label: t('medDaysCustom') }]}
        value={currentMode}
        onChange={(m) => {
          setMode(m);
          if (m === 'all') set('days', [...ALL_DAYS]);
          if (m === 'weekdays') set('days', [...WEEKDAYS]);
        }}
      />
      {currentMode === 'custom' ? (
        <View style={s.days}>
          {WEEK_ORDER.map((d) => (
            <FilterChip key={d} label={t(`wd${d}`)} selected={f.days.includes(d)}
              onPress={() => { touch('days'); set('days', f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d]); }} />
          ))}
        </View>
      ) : null}
      {shown('days', errors.days) ? <FormMessage>{t(errors.days!)}</FormMessage> : null}

      <Field icon="calendar-outline" label={t('medStart')} value={f.startDate} onChangeText={(v) => set('startDate', formatDateInput(v))} onTouched={() => touch('startDate')}
        error={shown('startDate', errors.startDate)} placeholder={t('medDatePlaceholder')} keyboardType="number-pad" maxLength={10} />
      <Field icon="flag-outline" label={t('medEnd')} value={f.endDate} onChangeText={(v) => set('endDate', formatDateInput(v))} onTouched={() => touch('endDate')}
        error={shown('endDate', errors.endDate)} placeholder={t('medDatePlaceholder')} keyboardType="number-pad" maxLength={10} />
      <SelectField label={t('medMeal')} value={f.mealRelation} options={options(MEAL_RELATIONS, MEAL_LABEL_KEYS)} onChange={(v) => set('mealRelation', v)}
        onTouched={() => touch('mealRelation')} error={shown('mealRelation', errors.mealRelation)} />
      <Field label={t('medNote')} value={f.note} onChangeText={(v) => set('note', v)} onTouched={() => touch('note')}
        error={shown('note', errors.note)} placeholder={t('medNotePlaceholder')} multiline maxLength={200} />
      <Field icon="layers-outline" label={t('medStock')} hint={t('medStockHint')} value={f.stock} onChangeText={(v) => set('stock', v.replace(/[^\d]/g, ''))}
        onTouched={() => touch('stock')} error={shown('stock', errors.stock)} placeholder={t('medStockPlaceholder')} keyboardType="number-pad" maxLength={4} />
      <SwitchRow label={t('medEnabled')} value={f.enabled} onValueChange={(v) => set('enabled', v)} />

      {error ? <FormMessage>{t(error)}</FormMessage> : null}
      <Button title={t('medSave')} icon="checkmark" onPress={() => void save()} disabled={!isValid(errors) || !ward} loading={saving} />
      <Button variant="secondary" title={t('back')} onPress={() => router.back()} />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs, marginBottom: t.spacing.xs },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, paddingLeft: t.spacing.sm, paddingRight: 4, minHeight: 44,
    borderRadius: t.radius.pill, backgroundColor: t.colors.primarySoft,
  },
  webRow: { flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing.xs },
  picker: { gap: t.spacing.xs, alignItems: 'stretch' },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs, marginTop: t.spacing.sm },
}));
