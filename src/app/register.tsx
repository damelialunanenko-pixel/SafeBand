import { useRouter, type Href } from 'expo-router';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { useState } from 'react';
import { Text, View } from 'react-native';
import {
  Button, Checkbox, Field, PasswordField, PhoneField, RuleRow, Screen, StepIndicator, Title, s as form, useTouched,
} from '@/components/form';
import { useLocalization } from '@/localization';
import { errorKey } from '@/services/auth-errors';
import { auth } from '@/services/firebase';
import { savePendingRegistration } from '@/services/local-store';
import { REGISTRATION_STEPS } from '@/services/registration-steps';
import { isValid, normalizeEmail, passwordRules, toE164, validateAccountStep, type AccountForm } from '@/services/validation';

export default function RegisterScreen() {
  const { t } = useLocalization();
  const router = useRouter();
  const [f, setF] = useState<AccountForm>({ email: '', password: '', confirm: '', phone: '', consent: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { touch, shown } = useTouched<keyof AccountForm>();
  const set = <K extends keyof AccountForm>(key: K) => (value: AccountForm[K]) => setF((prev) => ({ ...prev, [key]: value }));

  const errors = validateAccountStep(f);
  const rules = passwordRules(f.password);

  const submit = async () => {
    setLoading(true); setError(null);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, normalizeEmail(f.email), f.password);
      // Firestore accepts writes only from verified accounts, so keep these until the profile step.
      await savePendingRegistration(user.uid, { phone: toE164(f.phone) ?? '', consentAcceptedAt: Date.now() });
      await sendEmailVerification(user);
      // AuthGuard now moves the user to /verify-email.
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <StepIndicator step={1} total={REGISTRATION_STEPS} title={t('stepAccount')} />
      <Title>{t('registerTitle')}</Title>
      <Field label={t('email')} value={f.email} onChangeText={set('email')} onTouched={() => touch('email')} error={shown('email', errors.email)}
        placeholder={t('emailPlaceholder')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" />
      <PasswordField label={t('password')} value={f.password} onChangeText={set('password')} onTouched={() => touch('password')} error={shown('password', errors.password)}
        placeholder={t('newPasswordPlaceholder')} autoComplete="new-password" textContentType="newPassword" />
      <View style={{ marginTop: -6, marginBottom: 14 }}>
        <RuleRow ok={rules.length} text={t('ruleLength')} />
        <RuleRow ok={rules.upper} text={t('ruleUpper')} />
        <RuleRow ok={rules.lower} text={t('ruleLower')} />
        <RuleRow ok={rules.digitOrSymbol} text={t('ruleDigitOrSymbol')} />
      </View>
      <PasswordField label={t('confirmPassword')} value={f.confirm} onChangeText={set('confirm')} onTouched={() => touch('confirm')} error={shown('confirm', errors.confirm)}
        placeholder={t('confirmPasswordPlaceholder')} autoComplete="new-password" textContentType="newPassword" />
      <PhoneField label={t('phone')} value={f.phone} onChangeText={set('phone')} onTouched={() => touch('phone')} error={shown('phone', errors.phone)}
        placeholder={t('phonePlaceholder')} />
      <Checkbox checked={f.consent} onChange={(v) => { set('consent')(v); touch('consent'); }} error={shown('consent', errors.consent)}>
        <Text style={form.checkText}>{t('consentText')}</Text>
        <Text style={form.link} accessibilityRole="link" onPress={() => router.push('/privacy' as Href)}>{t('consentLink')}</Text>
      </Checkbox>
      {error ? <Text style={form.error}>{t(error)}</Text> : null}
      <Button title={t('next')} onPress={() => void submit()} disabled={!isValid(errors)} loading={loading} />
      <Button variant="link" title={`${t('returningTitle')} ${t('returningAction')}`} onPress={() => router.replace('/auth')} />
    </Screen>
  );
}
