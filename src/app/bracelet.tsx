import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Button, Field, FormMessage, Screen, StepIndicator, Subtitle, Title, useTouched } from '@/components/form';
import { useLocalization } from '@/localization';
import { bindBracelet } from '@/services/care-repository';
import { REGISTRATION_STEPS } from '@/services/registration-steps';
import { validateBraceletId } from '@/services/validation';

/** Registration step 6 (optional): link a bracelet to the ward, or "Link later". */
export default function BraceletScreen() {
  const { t } = useLocalization();
  const router = useRouter();
  const { wardId, onboarding } = useLocalSearchParams<{ wardId?: string; onboarding?: string }>();
  const [braceletId, setBraceletId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { touch, shown } = useTouched<'braceletId'>();
  const idError = validateBraceletId(braceletId);

  const bind = async () => {
    if (!wardId) return;
    setSaving(true); setError(null);
    try {
      await bindBracelet(wardId, braceletId.trim());
      Alert.alert(t('braceletTitle'), t('braceletBound'));
      router.replace('/home');
    } catch {
      setError('braceletBindError');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      {onboarding ? <StepIndicator step={6} total={REGISTRATION_STEPS} title={t('stepBracelet')} /> : null}
      <Title>{t('braceletTitle')}</Title>
      <Subtitle>{t('braceletBody')}</Subtitle>
      <Field icon="watch-outline" label={t('braceletId')} value={braceletId} onChangeText={setBraceletId} onTouched={() => touch('braceletId')}
        error={shown('braceletId', idError)} placeholder={t('braceletPlaceholder')} autoCapitalize="characters" autoCorrect={false} />
      {error ? <FormMessage>{t(error)}</FormMessage> : null}
      <Button title={t('bindBracelet')} onPress={() => void bind()} disabled={!!idError || !wardId} loading={saving} />
      <Button variant="secondary" title={t('bindLater')} onPress={() => router.replace('/home')} disabled={saving} />
    </Screen>
  );
}
