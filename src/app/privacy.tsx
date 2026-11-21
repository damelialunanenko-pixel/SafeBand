import { useRouter } from 'expo-router';
import { Button, Card, Hint, Screen, Title } from '@/components/form';
import { AppText } from '@/components/ui';
import { useLocalization } from '@/localization';

/** Placeholder privacy policy. Replace `privacyBody` in src/localization/forms.ts with the final text. */
export default function PrivacyScreen() {
  const { t } = useLocalization();
  const router = useRouter();
  return (
    <Screen>
      <Title>{t('privacyTitle')}</Title>
      <Hint>{t('privacyTemplateNotice')}</Hint>
      <Card><AppText variant="body" tone="secondary">{t('privacyBody')}</AppText></Card>
      <Button variant="secondary" title={t('back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Screen>
  );
}
