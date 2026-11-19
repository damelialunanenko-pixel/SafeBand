import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Screen, StepIndicator, Subtitle, Title, colors, s as form } from '@/components/form';
import { SecurityQuestionsForm } from '@/components/security-questions-form';
import { SECURITY_QUESTIONS, areSecurityAnswersComplete, emptySecurityAnswers, optionLabel, type SecurityAnswers } from '@/config/security-questions';
import { useLocalization } from '@/localization';
import { REGISTRATION_STEPS } from '@/services/registration-steps';
import { saveSecurityAnswers } from '@/services/security';
import { useSession } from '@/services/session';

/** Registration step 3: choose answers, then confirm them on a "Check your answers" summary. */
export default function SecuritySetupScreen() {
  const { t, language } = useLocalization();
  const { markDeviceTrusted } = useSession();
  const [answers, setAnswers] = useState<SecurityAnswers>(emptySecurityAnswers);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true); setError(null);
    const result = await saveSecurityAnswers(answers);
    setSaving(false);
    // The device that set the answers is trusted. AuthGuard then continues to the caregiver profile.
    if (result === 'ok') await markDeviceTrusted();
    // 'alreadySet': answers were saved earlier — AuthGuard sends the user to the check screen.
    else if (result !== 'alreadySet') setError(result === 'network' ? 'errNetwork' : 'securitySaveError');
  };

  return (
    <Screen>
      <StepIndicator step={3} total={REGISTRATION_STEPS} title={t('stepSecurity')} />
      <Title>{reviewing ? t('checkAnswersTitle') : t('securityTitle')}</Title>
      <Card><Text style={{ color: colors.title, fontWeight: '700', lineHeight: 21 }}>{t('securityHint')}</Text></Card>
      {reviewing ? (
        <>
          <Subtitle>{t('checkAnswersHint')}</Subtitle>
          {SECURITY_QUESTIONS.map((q, i) => (
            <View key={q.id} style={form.field}>
              <Text style={form.label}>{i + 1}. {q.label[language]}</Text>
              <Text style={{ fontSize: 18, color: colors.title, fontWeight: '700' }}>{optionLabel(q.options, answers[q.id], language)}</Text>
            </View>
          ))}
          {error ? <Text style={form.error}>{t(error)}</Text> : null}
          <Button title={t('saveAnswers')} onPress={() => void save()} loading={saving} />
          <Button variant="secondary" title={t('change')} onPress={() => setReviewing(false)} disabled={saving} />
        </>
      ) : (
        <>
          <SecurityQuestionsForm value={answers} onChange={setAnswers} />
          <Button title={t('next')} onPress={() => setReviewing(true)} disabled={!areSecurityAnswersComplete(answers)} />
        </>
      )}
    </Screen>
  );
}
