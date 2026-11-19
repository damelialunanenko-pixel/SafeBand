import { signOut } from 'firebase/auth';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button, Screen, Subtitle, Title, s as form } from '@/components/form';
import { SecurityQuestionsForm } from '@/components/security-questions-form';
import { areSecurityAnswersComplete, emptySecurityAnswers, type SecurityAnswers } from '@/config/security-questions';
import { useLocalization } from '@/localization';
import { auth } from '@/services/firebase';
import { checkSecurityAnswers } from '@/services/security';
import { useSession } from '@/services/session';

/**
 * Shown after the password when this device has no "trusted" flag for the uid.
 * NOTE: an application-level check, not Firebase multi-factor authentication
 * (see services/security.ts and services/local-store.ts).
 */
export default function SecurityCheckScreen() {
  const { t, language } = useLocalization();
  const { markDeviceTrusted } = useSession();
  const [answers, setAnswers] = useState<SecurityAnswers>(emptySecurityAnswers);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const verify = async () => {
    setChecking(true); setMessage(null);
    const result = await checkSecurityAnswers(answers);
    setChecking(false);
    if (result.kind === 'ok') return markDeviceTrusted(); // AuthGuard continues
    if (result.kind === 'wrong') setMessage(t('securityWrong', { n: result.attemptsLeft }));
    else if (result.kind === 'locked') {
      const time = new Date(result.lockedUntil).toLocaleTimeString(language === 'en' ? 'en-GB' : language === 'kk' ? 'kk-KZ' : 'ru-RU', { hour: '2-digit', minute: '2-digit' });
      setMessage(t('securityLocked', { time }));
    } else setMessage(t(result.network ? 'errNetwork' : 'errUnknown'));
  };

  return (
    <Screen>
      <Title>{t('securityCheckTitle')}</Title>
      <Subtitle>{t('securityCheckBody')}</Subtitle>
      <SecurityQuestionsForm value={answers} onChange={setAnswers} />
      {message ? <Text style={form.error} accessibilityLiveRegion="polite">{message}</Text> : null}
      <Button title={t('verifyAnswers')} onPress={() => void verify()} disabled={!areSecurityAnswersComplete(answers)} loading={checking} />
      <Button variant="link" title={t('signOut')} onPress={() => void signOut(auth)} />
    </Screen>
  );
}
