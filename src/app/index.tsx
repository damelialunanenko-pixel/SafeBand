import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Appear, AppText, Card, GradientCard, Icon, IconCircle, PressableScale } from '@/components/ui';
import { useLocalization } from '@/localization';
import { makeStyles, useAppTheme } from '@/theme';

export default function Welcome() {
  const router = useRouter();
  const { t } = useLocalization();
  const { gradients, colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const s = useStyles();
  return (
    <View style={[s.page, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <LinearGradient colors={gradients.header} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={gradients.headerGlow} start={{ x: 1, y: 0 }} end={{ x: 0.3, y: 0.6 }} style={s.glow} pointerEvents="none" />

      <Appear style={s.header}>
        <View style={s.logo}>
          <IconCircle name="shield-checkmark" tone="primary" size={72} />
        </View>
        <AppText variant="display" accessibilityRole="header" center>{t('careBand')}</AppText>
        <AppText variant="bodyMedium" tone="secondary" center>{t('startSubtitle')}</AppText>
      </Appear>

      <Appear index={1}>
        <PressableScale onPress={() => router.push('/register' as Href)} accessibilityLabel={`${t('firstTimeTitle')} ${t('firstTimeAction')}`} scaleTo={0.98}>
          <GradientCard>
            <AppText variant="bodyMedium" tone="onPrimary" style={s.question}>{t('firstTimeTitle')}</AppText>
            <View style={s.actionRow}>
              <AppText variant="h1" tone="onPrimary" style={s.flex}>{t('firstTimeAction')}</AppText>
              <View style={s.arrowLight}><Icon name="arrow-forward" size={22} color={colors.primaryStrong} /></View>
            </View>
          </GradientCard>
        </PressableScale>
      </Appear>

      <Appear index={2}>
        <Card onPress={() => router.push('/auth')} accessibilityLabel={`${t('returningTitle')} ${t('returningAction')}`} style={s.secondCard}>
          <AppText variant="bodyMedium" tone="secondary">{t('returningTitle')}</AppText>
          <View style={s.actionRow}>
            <AppText variant="h1" tone="primary" style={s.flex}>{t('returningAction')}</AppText>
            <View style={s.arrowSoft}><Icon name="arrow-forward" size={22} color={colors.onPrimarySoft} /></View>
          </View>
        </Card>
      </Appear>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  page: { flex: 1, justifyContent: 'center', paddingHorizontal: t.spacing.screen, gap: t.spacing.md, backgroundColor: t.colors.background },
  glow: { position: 'absolute', top: 0, right: 0, width: 300, height: 300 },
  header: { alignItems: 'center', gap: t.spacing.xs, marginBottom: t.spacing.xl },
  logo: { padding: 8, borderRadius: t.radius.pill, backgroundColor: t.colors.iconButton, marginBottom: t.spacing.sm, ...t.shadows.md },
  flex: { flex: 1 },
  question: { opacity: 0.92 },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: t.spacing.xxs, gap: t.spacing.sm },
  arrowLight: { width: t.touchTarget, height: t.touchTarget, borderRadius: t.touchTarget / 2, backgroundColor: t.colors.iconButton, alignItems: 'center', justifyContent: 'center' },
  arrowSoft: { width: t.touchTarget, height: t.touchTarget, borderRadius: t.touchTarget / 2, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  secondCard: { padding: t.spacing.lg },
}));
