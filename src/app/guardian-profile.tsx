import { useRouter, type Href } from 'expo-router';
import { doc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { useState } from 'react';
import { AddressFields } from '@/components/address-fields';
import { Button, Field, FormMessage, FormSkeleton, Hint, PhoneField, Screen, SectionTitle, SelectField, StepIndicator, Subtitle, Title, useTouched } from '@/components/form';
import { RELATION_OPTIONS } from '@/config/profile-options';
import { useDraft } from '@/hooks/use-draft';
import { useLocalization } from '@/localization';
import { db } from '@/services/firebase';
import { loadPendingRegistration } from '@/services/local-store';
import { emptyGuardianForm, guardianToDoc, guardianToForm, withoutUndefined } from '@/services/profile-mapping';
import { REGISTRATION_STEPS } from '@/services/registration-steps';
import { useSession } from '@/services/session';
import { formatPhoneInput, isValid, validateGuardianForm, type GuardianForm } from '@/services/validation';

/** Registration step 4 (and later editing): caregiver profile in users/{uid}. */
export default function GuardianProfileScreen() {
  const { t } = useLocalization();
  const router = useRouter();
  const { user, profile } = useSession();
  const uid = user?.uid;
  const onboarding = !profile?.profileComplete;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { touch, shown, touchAll } = useTouched<keyof GuardianForm>();

  const { value: f, setValue, ready, discard } = useDraft<GuardianForm>('guardian', uid, emptyGuardianForm, async () => {
    if (profile?.profileComplete) return guardianToForm(profile);
    const pending = uid ? await loadPendingRegistration(uid) : null;
    return pending?.phone ? { workPhone: formatPhoneInput(pending.phone) } : null;
  });
  const set = <K extends keyof GuardianForm>(key: K, v: GuardianForm[K]) => setValue((prev) => ({ ...prev, [key]: v }));
  const errors = validateGuardianForm(f);

  const save = async () => {
    if (!uid || !user) return;
    if (!isValid(errors)) return touchAll(Object.keys(errors) as (keyof GuardianForm)[]);
    setSaving(true); setError(null);
    try {
      const pending = await loadPendingRegistration(uid);
      await setDoc(doc(db, 'users', uid), withoutUndefined({
        ...guardianToDoc(f),
        email: user.email ?? undefined,
        phone: pending?.phone || undefined,
        consentAcceptedAt: pending ? Timestamp.fromMillis(pending.consentAcceptedAt) : undefined,
        profileComplete: true,
        updatedAt: serverTimestamp(),
      }), { merge: true });
      await discard();
      if (onboarding) router.replace('/ward?onboarding=1' as Href);
      else router.back();
    } catch {
      setError('profileSaveError');
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return <Screen scroll={false}><FormSkeleton label={t('loading')} /></Screen>;

  return (
    <Screen>
      {onboarding ? <StepIndicator step={4} total={REGISTRATION_STEPS} title={t('stepGuardian')} /> : null}
      <Title>{t('guardianTitle')}</Title>
      <Subtitle>{t('guardianSubtitle')}</Subtitle>
      <Hint>{t('asInId')}</Hint>
      <Field label={t('lastName')} value={f.lastName} onChangeText={(v) => set('lastName', v)} onTouched={() => touch('lastName')}
        error={shown('lastName', errors.lastName)} placeholder={t('lastNamePlaceholder')} autoCapitalize="words" autoComplete="name-family" />
      <Field label={t('firstName')} value={f.firstName} onChangeText={(v) => set('firstName', v)} onTouched={() => touch('firstName')}
        error={shown('firstName', errors.firstName)} placeholder={t('firstNamePlaceholder')} autoCapitalize="words" autoComplete="name-given" />
      <Field label={t('middleName')} value={f.middleName} onChangeText={(v) => set('middleName', v)} onTouched={() => touch('middleName')}
        error={shown('middleName', errors.middleName)} placeholder={t('middleNamePlaceholder')} autoCapitalize="words" autoComplete="name-middle" />
      <PhoneField label={t('workPhone')} value={f.workPhone} onChangeText={(v) => set('workPhone', v)} onTouched={() => touch('workPhone')}
        error={shown('workPhone', errors.workPhone)} placeholder={t('phonePlaceholder')} />
      <PhoneField label={t('secondPhone')} hint={t('secondPhoneHint')} value={f.secondPhone} onChangeText={(v) => set('secondPhone', v)} onTouched={() => touch('secondPhone')}
        error={shown('secondPhone', errors.secondPhone)} placeholder={t('phonePlaceholder')} />
      <SelectField label={t('relation')} value={f.relation} options={RELATION_OPTIONS} onChange={(id) => set('relation', id)} onTouched={() => touch('relation')}
        error={shown('relation', errors.relation)} />
      {f.relation === 'other' ? (
        <Field label={t('relationOther')} value={f.relationOther} onChangeText={(v) => set('relationOther', v)} onTouched={() => touch('relationOther')}
          error={shown('relationOther', errors.relationOther)} placeholder={t('relationOtherPlaceholder')} />
      ) : null}
      <SectionTitle>{t('addressTitle')}</SectionTitle>
      <AddressFields value={f} onChange={set} errors={errors} touch={touch} shown={shown} />
      <Hint>{t('draftHint')}</Hint>
      {error ? <FormMessage>{t(error)}</FormMessage> : null}
      <Button title={onboarding ? t('next') : t('save')} onPress={() => void save()} disabled={!isValid(errors)} loading={saving} />
      {!onboarding ? <Button variant="secondary" title={t('back')} onPress={() => router.back()} /> : null}
    </Screen>
  );
}
