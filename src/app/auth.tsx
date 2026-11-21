import { useRouter, type Href } from 'expo-router';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Button, Field, FormMessage, PasswordField, Screen, Subtitle, Title, useTouched } from '@/components/form';
import { useLocalization } from '@/localization';
import { errorKey } from '@/services/auth-errors';
import { auth } from '@/services/firebase';
import { normalizeEmail, validateEmail } from '@/services/validation';

export default function SignInScreen() {
  const { t } = useLocalization();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { touch, shown } = useTouched<'email' | 'password'>();

  const emailError = validateEmail(email);
  const passwordError = password ? null : 'errRequired';
  const valid = !emailError && !passwordError;

  // Navigation after success is done by AuthGuard (verify email → security check → home).
  const submit = async () => {
    setLoading(true); setError(null);
    try { await signInWithEmailAndPassword(auth, normalizeEmail(email), password); }
    catch (e) { setError(errorKey(e)); }
    finally { setLoading(false); }
  };

  const forgot = async () => {
    touch('email');
    if (emailError) return Alert.alert(t('resetTitle'), t('resetEnterEmail'));
    try { await sendPasswordResetEmail(auth, normalizeEmail(email)); }
    catch (e) {
      // Same answer whether or not the account exists; only connectivity problems are reported.
      if (errorKey(e) === 'errNetwork' || errorKey(e) === 'errTooManyRequests') return Alert.alert(t('resetTitle'), t(errorKey(e)));
    }
    Alert.alert(t('resetTitle'), t('resetSent'));
  };

  return (
    <Screen>
      <Title>{t('signInTitle')}</Title>
      <Subtitle>{t('careBand')}</Subtitle>
      <Field icon="mail-outline" label={t('email')} value={email} onChangeText={setEmail} onTouched={() => touch('email')} error={shown('email', emailError)}
        placeholder={t('emailPlaceholder')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" />
      <PasswordField label={t('password')} value={password} onChangeText={setPassword} onTouched={() => touch('password')} error={shown('password', passwordError)}
        placeholder={t('passwordPlaceholder')} autoComplete="current-password" textContentType="password" onSubmitEditing={() => valid && void submit()} />
      {error ? <FormMessage>{t(error)}</FormMessage> : null}
      <Button title={t('signIn')} onPress={() => void submit()} disabled={!valid} loading={loading} />
      <Button variant="link" title={t('forgotPassword')} onPress={() => void forgot()} />
      <Button variant="link" title={t('noAccountYet')} onPress={() => router.replace('/register' as Href)} />
    </Screen>
  );
}
