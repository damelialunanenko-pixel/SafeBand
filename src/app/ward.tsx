import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { AddressFields } from '@/components/address-fields';
import {
  Button, Field, FormMessage, FormSkeleton, Hint, MultiSelect, PhoneField, Screen, SectionTitle, StepIndicator, SwitchRow, Title, useTouched,
} from '@/components/form';
import { DIAGNOSIS_OPTIONS } from '@/config/profile-options';
import { useDraft } from '@/hooks/use-draft';
import { useLocalization } from '@/localization';
import { db } from '@/services/firebase';
import { emptyWardForm, wardToDoc } from '@/services/profile-mapping';
import { REGISTRATION_STEPS } from '@/services/registration-steps';
import { useSession } from '@/services/session';
import { calculateAge, formatDateInput, isValid, parseDateInput, validateWardForm, type WardForm } from '@/services/validation';

/** Registration step 5 (and "Add person" from home): profile of the person in care. */
export default function WardScreen() {
  const { t, language } = useLocalization();
  const router = useRouter();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const { user, profile } = useSession();
  const uid = user?.uid;
  const guardianAddress = profile?.address;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { touch, shown, touchAll } = useTouched<keyof WardForm>();

  const { value: f, setValue, ready, discard } = useDraft<WardForm>('ward', uid, emptyWardForm);
  const set = <K extends keyof WardForm>(key: K, v: WardForm[K]) => setValue((prev) => ({ ...prev, [key]: v }));
  // Without a caregiver address the ward needs its own.
  const form_ = guardianAddress ? f : { ...f, sameAddress: false };
  const errors = validateWardForm(form_);
  const birthIso = parseDateInput(f.birthDate);
  const age = birthIso && !errors.birthDate ? calculateAge(birthIso) : null;

  const save = async () => {
    if (!uid) return;
    if (!isValid(errors)) return touchAll(Object.keys(errors) as (keyof WardForm)[]);
    setSaving(true); setError(null);
    try {
      const ref = await addDoc(collection(db, 'wards'), { ...wardToDoc(form_, guardianAddress, language), guardianId: uid, createdAt: serverTimestamp() });
      await discard();
      router.replace(`/bracelet?wardId=${encodeURIComponent(ref.id)}${onboarding ? '&onboarding=1' : ''}` as Href);
    } catch {
      setError('saveError');
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return <Screen scroll={false}><FormSkeleton label={t('loading')} /></Screen>;

  return (
    <Screen>
      {onboarding ? <StepIndicator step={5} total={REGISTRATION_STEPS} title={t('stepWard')} /> : null}
      <Title>{t('wardTitle')}</Title>
      <Hint>{t('wardAsInId')}</Hint>
      <Field label={t('lastName')} value={f.lastName} onChangeText={(v) => set('lastName', v)} onTouched={() => touch('lastName')}
        error={shown('lastName', errors.lastName)} placeholder={t('wardLastNamePlaceholder')} autoCapitalize="words" />
      <Field label={t('firstName')} value={f.firstName} onChangeText={(v) => set('firstName', v)} onTouched={() => touch('firstName')}
        error={shown('firstName', errors.firstName)} placeholder={t('wardFirstNamePlaceholder')} autoCapitalize="words" />
      <Field label={t('middleName')} value={f.middleName} onChangeText={(v) => set('middleName', v)} onTouched={() => touch('middleName')}
        error={shown('middleName', errors.middleName)} placeholder={t('wardMiddleNamePlaceholder')} autoCapitalize="words" />
      <Field label={t('birthDate')} value={f.birthDate} onChangeText={(v) => set('birthDate', formatDateInput(v))} onTouched={() => touch('birthDate')}
        error={shown('birthDate', errors.birthDate)} placeholder={t('birthDatePlaceholder')} keyboardType="number-pad" maxLength={10} />
      {age !== null ? <Hint tone="success">{t('ageYears', { n: age })}</Hint> : null}

      <MultiSelect label={t('diagnosesTitle')} hint={t('diagnosesHint')} options={DIAGNOSIS_OPTIONS} value={f.diagnoses}
        onChange={(ids) => { set('diagnoses', ids); touch('diagnoses'); }} error={shown('diagnoses', errors.diagnoses)} />
      {f.diagnoses.includes('other') ? (
        <Field label={t('diagnosisOther')} value={f.diagnosisOther} onChangeText={(v) => set('diagnosisOther', v)} onTouched={() => touch('diagnosisOther')}
          error={shown('diagnosisOther', errors.diagnosisOther)} placeholder={t('diagnosisOtherPlaceholder')} />
      ) : null}

      <SectionTitle>{t('wardAddress')}</SectionTitle>
      {guardianAddress ? (
        <SwitchRow label={t('sameAsGuardian')} value={f.sameAddress} onValueChange={(v) => set('sameAddress', v)} />
      ) : null}
      {!form_.sameAddress ? <AddressFields value={f} onChange={set} errors={errors} touch={touch} shown={shown} /> : null}

      <SectionTitle>{t('hospitalTitle')}</SectionTitle>
      <Field label={t('hospitalName')} value={f.hospitalName} onChangeText={(v) => set('hospitalName', v)} onTouched={() => touch('hospitalName')}
        error={shown('hospitalName', errors.hospitalName)} placeholder={t('hospitalNamePlaceholder')} />
      <Field label={t('hospitalAddress')} value={f.hospitalAddress} onChangeText={(v) => set('hospitalAddress', v)} onTouched={() => touch('hospitalAddress')}
        error={shown('hospitalAddress', errors.hospitalAddress)} placeholder={t('hospitalAddressPlaceholder')} />
      <PhoneField label={t('hospitalPhone')} value={f.hospitalPhone} onChangeText={(v) => set('hospitalPhone', v)} onTouched={() => touch('hospitalPhone')}
        error={shown('hospitalPhone', errors.hospitalPhone)} placeholder={t('phonePlaceholder')} />

      <Hint>{t('draftHint')}</Hint>
      {error ? <FormMessage>{t(error)}</FormMessage> : null}
      <Button title={t('next')} onPress={() => void save()} disabled={!isValid(errors)} loading={saving} />
      {!onboarding ? <Button variant="secondary" title={t('back')} onPress={() => router.back()} /> : null}
    </Screen>
  );
}
