import { useRouter, type Href } from 'expo-router';
import { Alert, View } from 'react-native';
import { DeleteAccountCard } from '@/components/delete-account';
import { MedicationRemindersCard } from '@/components/medication-reminders-card';
import { SmsSettingsCard } from '@/components/sms-settings-card';
import {
  Appear, AppText, Button, Card, GradientHeader, Icon, IconCircle, ListItem, PressableScale, ScreenScroll, selectionHaptic,
  TopBar, useToast,
} from '@/components/ui';
import { useLocalization, type Language } from '@/localization';
import { seedDemoData } from '@/services/care-repository';
import { makeStyles, useAppTheme } from '@/theme';

const languages: { id: Language; label: 'russian' | 'english' | 'kazakh'; flag: string }[] = [
  { id: 'ru', label: 'russian', flag: 'RU' },
  { id: 'en', label: 'english', flag: 'EN' },
  { id: 'kk', label: 'kazakh', flag: 'KZ' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { language, setLanguage, t } = useLocalization();
  const { colors } = useAppTheme();
  const toast = useToast();
  const s = useStyles();

  const seed = () => Alert.alert(t('seedDemoConfirm'), t('seedDemoWarning'), [
    { text: t('cancel'), style: 'cancel' },
    {
      text: t('confirm'),
      onPress: () => seedDemoData()
        .then(() => toast.show(t('seedDemoSuccess'), 'success'))
        .catch(() => toast.show(t('seedDemoError'), 'danger')),
    },
  ]);

  return (
    <ScreenScroll tabbed header={<GradientHeader><TopBar title={t('settings')} back={false} /></GradientHeader>}>
      <Appear index={0}>
        <Card style={s.card}>
          <View style={s.cardHead}>
            <IconCircle name="language" tone="primary" />
            <AppText variant="title" accessibilityRole="header">{t('language')}</AppText>
          </View>
          <View style={s.options} accessibilityRole="radiogroup">
            {languages.map((item) => {
              const on = language === item.id;
              return (
                <PressableScale
                  key={item.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={t(item.label)}
                  haptic={false}
                  scaleTo={0.98}
                  onPress={() => { selectionHaptic(); void setLanguage(item.id); }}
                  style={[s.option, on && s.optionOn]}
                >
                  <View style={[s.flag, on && s.flagOn]}>
                    <AppText variant="micro" tone={on ? 'onPrimary' : 'secondary'}>{item.flag}</AppText>
                  </View>
                  <AppText variant="bodyMedium" style={s.flex}>{t(item.label)}</AppText>
                  <Icon name={on ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={on ? colors.primary : colors.textMuted} />
                </PressableScale>
              );
            })}
          </View>
        </Card>
      </Appear>

      <Appear index={1}>
        <ListItem
          icon="person-circle"
          iconTone="lavender"
          title={t('guardianTitle')}
          subtitle={t('edit')}
          chevron
          onPress={() => router.push('/guardian-profile' as Href)}
        />
      </Appear>

      <Appear index={2}>
        <MedicationRemindersCard />
      </Appear>

      <Appear index={2}>
        <SmsSettingsCard />
      </Appear>

      <Appear index={3}>
        <Card style={s.card}>
          <View style={s.cardHead}>
            <IconCircle name="flask" tone="cyan" />
            <AppText variant="title" accessibilityRole="header" style={s.flex}>{t('seedDemo')}</AppText>
          </View>
          <AppText variant="body" tone="secondary">{t('seedDemoDescription')}</AppText>
          <Button variant="secondary" icon="sparkles" title={t('seedDemo')} onPress={seed} />
        </Card>
      </Appear>

      <Appear index={4}>
        <Card style={s.card}>
          <DeleteAccountCard />
        </Card>
      </Appear>
    </ScreenScroll>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  card: { gap: t.spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  options: { gap: t.spacing.xs },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, minHeight: 52, paddingHorizontal: t.spacing.sm,
    borderRadius: t.radius.md, backgroundColor: t.colors.background,
  },
  optionOn: { backgroundColor: t.colors.primarySoft },
  flag: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.card },
  flagOn: { backgroundColor: t.colors.primaryStrong },
}));
