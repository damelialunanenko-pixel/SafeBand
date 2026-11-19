import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { Button, Card, Hint, Screen, Title, colors } from '@/components/form';
import { useLocalization } from '@/localization';

/** Placeholder privacy policy. Replace `privacyBody` in src/localization/forms.ts with the final text. */
export default function PrivacyScreen() {
  const { t } = useLocalization();
  const router = useRouter();
  return (
    <Screen>
      <Title>{t('privacyTitle')}</Title>
      <Hint>{t('privacyTemplateNotice')}</Hint>
      <Card><Text style={{ color: colors.text, lineHeight: 22, fontSize: 15 }}>{t('privacyBody')}</Text></Card>
      <Button variant="secondary" title={t('back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Screen>
  );
}
