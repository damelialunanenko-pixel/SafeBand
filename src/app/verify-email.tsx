import { sendEmailVerification, signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Button, Screen, StepIndicator, Subtitle, Title, colors, s as form } from '@/components/form';
import { useLocalization } from '@/localization';
import { errorKey } from '@/services/auth-errors';
import { auth } from '@/services/firebase';
import { REGISTRATION_STEPS } from '@/services/registration-steps';
import { useSession } from '@/services/session';

const RESEND_SECONDS = 60;

export default function VerifyEmailScreen() {
  const { t } = useLocalization();
  const { user, refreshUser } = useSession();
  // The letter was just sent by the registration step (or on a previous launch), so the timer starts running.
  const [resendAt, setResendAt] = useState(() => Date.now() + RESEND_SECONDS * 1000);
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState<{ key: string; error?: boolean } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));

  // On success AuthGuard continues to the security questions.
  const check = async () => {
    setChecking(true); setMessage(null);
    try {
      await refreshUser();
      if (!auth.currentUser?.emailVerified) setMessage({ key: 'verifyNotYet', error: true });
    } catch (e) { setMessage({ key: errorKey(e), error: true }); }
    finally { setChecking(false); }
  };

  const resend = async () => {
    if (!auth.currentUser) return;
    setResendAt(Date.now() + RESEND_SECONDS * 1000); setMessage(null);
    try { await sendEmailVerification(auth.currentUser); setMessage({ key: 'verifySent' }); }
    catch (e) { setMessage({ key: errorKey(e), error: true }); }
  };

  return (
    <Screen>
      <StepIndicator step={2} total={REGISTRATION_STEPS} title={t('stepEmail')} />
      <Title>{t('verifyTitle')}</Title>
      <Subtitle>{t('verifyBody', { email: user?.email ?? '' })}</Subtitle>
      {message ? <Text style={message.error ? form.error : [form.hint, { color: colors.ok }]}>{t(message.key)}</Text> : null}
      <Button title={t('verifyDone')} onPress={() => void check()} loading={checking} />
      <Button variant="secondary" title={secondsLeft ? t('verifyResendIn', { s: secondsLeft }) : t('verifyResend')} onPress={() => void resend()} disabled={secondsLeft > 0} />
      <Text style={[form.hint, { marginTop: 24 }]}>{t('verifyWrongEmail')}</Text>
      <Button variant="link" title={t('signOut')} onPress={() => void signOut(auth)} />
    </Screen>
  );
}
