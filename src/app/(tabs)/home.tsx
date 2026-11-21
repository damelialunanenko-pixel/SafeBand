import { useRouter, type Href } from 'expo-router';
import { Alert, Linking, ScrollView, View } from 'react-native';
import { EventRow } from '@/components/care/event-row';
import { locationChip, locationStatusText, readableTime } from '@/components/care/format';
import { MetricRing } from '@/components/care/metric-ring';
import { QuickAction } from '@/components/care/quick-action';
import { SosButton } from '@/components/care/sos-button';
import {
  Appear, AppText, Avatar, Card, Chip, EmptyState, GradientCard, GradientHeader, Icon, IconButton, IconCircle,
  ScreenScroll, SectionHeader, Skeleton, SkeletonList, warningHaptic,
} from '@/components/ui';
import { DEFAULT_HEALTH_THRESHOLDS } from '@/config/care';
import { useCareAlerts } from '@/hooks/use-care-alerts';
import { usePrimaryCareData } from '@/hooks/use-care-data';
import { useLiveRefresh } from '@/hooks/use-refresh';
import { useWardEvents } from '@/hooks/use-ward-events';
import { useLocalization } from '@/localization';
import { assessLocation, healthStatus } from '@/services/care-logic';
import { setSos } from '@/services/care-repository';
import { useSession } from '@/services/session';
import { makeStyles, useAppTheme } from '@/theme';

export default function Dashboard() {
  const router = useRouter();
  const { t } = useLocalization();
  const { profile } = useSession();
  const { colors } = useAppTheme();
  const s = useStyles();
  const { ward, device, loading, error } = usePrimaryCareData();
  const { events, loading: eventsLoading, error: eventsError } = useWardEvents(ward, 4);
  const { refreshing, onRefresh } = useLiveRefresh();
  useCareAlerts(ward, device);

  const guardianName = profile?.firstName?.trim();

  if (loading) return <HomeSkeleton label={t('loading')} />;

  if (!ward) {
    return (
      <ScreenScroll tabbed header={<Header greeting={guardianName ? t('greeting', { name: guardianName }) : t('careBand')} />}>
        <Appear>
          <EmptyState icon="person-add" title={t('careBand')} description={t('addPersonPrompt')} actionTitle={t('addPerson')} onAction={() => router.push('/ward')} />
        </Appear>
      </ScreenScroll>
    );
  }

  const assessment = assessLocation(device?.location, ward.safePlaces, ward.safeRoutes);
  const thresholds = ward.healthThresholds ?? DEFAULT_HEALTH_THRESHOLDS;
  const health = healthStatus(device ?? undefined, thresholds);
  const sos = Boolean(device?.sos?.active);
  const chip = locationChip(assessment, t);
  const address = device?.location?.address
    ?? (device?.location ? `${device.location.lat.toFixed(5)}, ${device.location.lng.toFixed(5)}` : t('waitingLocation'));
  const unread = events.some((e) => e.requiresAttention && e.severity !== 'info');
  const healthLabel = health.label === 'No data' ? t('noData') : health.label === 'Normal' ? t('normal') : health.label;
  const lowBattery = typeof device?.battery === 'number' && device.battery <= 20;

  const confirmSos = () => {
    warningHaptic();
    Alert.alert(t(sos ? 'cancelSosTitle' : 'activateSos'), t(sos ? 'sosCancelMessage' : 'sosActivateMessage'), [
      { text: t('keepMonitoring'), style: 'cancel' },
      {
        text: t('continue'), style: 'destructive',
        onPress: () => Alert.alert(t('confirmAgain'), t('sosConfirmMessage'), [
          { text: t('cancel'), style: 'cancel' },
          { text: t('confirm'), style: 'destructive', onPress: () => setSos(ward, !sos).catch((e) => Alert.alert(t('sosError'), e.message)) },
        ]),
      },
    ]);
  };

  const call = () => { if (ward.braceletPhone) void Linking.openURL(`tel:${ward.braceletPhone}`); };

  return (
    <ScreenScroll
      tabbed
      refreshing={refreshing}
      onRefresh={onRefresh}
      header={
        <Header
          greeting={guardianName ? t('greeting', { name: guardianName }) : t('careBand')}
          subtitle={t('monitoring', { name: ward.name })}
          wardName={ward.name}
          unread={unread}
          onBell={() => router.push('/history')}
        />
      }
    >
      {error ? (
        <Appear>
          <Card tone="danger" style={s.errorCard}>
            <Icon name="cloud-offline" size={20} color={colors.onDangerSoft} />
            <AppText variant="caption" tone="danger" style={s.flex}>{t('deviceError')}: {error}</AppText>
          </Card>
        </Appear>
      ) : null}

      <Appear index={0}>
        <GradientCard>
          <View style={s.heroTop}>
            <IconCircle name="location" tone="white" size={40} />
            <AppText variant="micro" tone="onPrimary" style={s.heroLabel}>{t('location').toUpperCase()}</AppText>
            <IconButton icon="arrow-forward" variant="glass" onPress={() => router.push('/map')} accessibilityLabel={t('tabMap')} />
          </View>
          <AppText variant="h1" tone="onPrimary" style={s.heroStatus} numberOfLines={2}>{locationStatusText(assessment, t)}</AppText>
          <AppText variant="bodyMedium" tone="onPrimary" style={s.heroAddress} numberOfLines={2}>{address}</AppText>
          <View style={s.heroBottom}>
            <Chip label={sos ? t('sosActive') : chip.label} tone={sos ? 'danger' : chip.tone} icon={sos ? 'alert-circle' : chip.icon} />
            <SosButton active={sos} label={t(sos ? 'cancelSos' : 'sos')} hint={t('sosHint')} onPress={confirmSos} />
          </View>
        </GradientCard>
      </Appear>

      <Appear index={1} style={s.rings}>
        <MetricRing
          label={t('pulseShort')} unit="BPM" icon="heart" value={device?.heartRate} min={40} max={160}
          colors={[colors.lavender, colors.primary]} alert={health.issues.includes('heart_rate')} onPress={() => router.push('/health')}
        />
        <MetricRing
          label={t('spo2Short')} unit="%" icon="water" value={device?.spo2} min={80} max={100}
          colors={[colors.primary, colors.cyan]} alert={health.issues.includes('spo2')} onPress={() => router.push('/health')}
        />
        <MetricRing
          label={t('batteryShort')} unit="%" icon="battery-half" value={device?.battery} min={0} max={100}
          colors={lowBattery ? [colors.warning, colors.danger] : [colors.success, colors.cyan]} alert={lowBattery}
        />
      </Appear>

      <Appear index={2} style={s.healthRow}>
        <Chip
          label={`${t('health')}: ${healthLabel}`}
          tone={health.severity === 'critical' ? 'danger' : health.label === 'Normal' ? 'success' : 'neutral'}
          icon={health.severity === 'critical' ? 'warning' : 'pulse'}
        />
        <AppText variant="caption" tone="muted" style={s.flex} numberOfLines={2}>
          {t('lastUpdated')}: {readableTime(device?.location?.updatedAt, t('unavailable'))}
        </AppText>
      </Appear>

      <Appear index={3}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quick} style={s.quickScroll}>
          <QuickAction icon="map" label={t('quickMap')} tone="primary" onPress={() => router.push('/map')} />
          <QuickAction icon="heart" label={t('quickHealth')} tone="success" onPress={() => router.push('/health')} />
          <QuickAction icon="time" label={t('quickHistory')} tone="lavender" onPress={() => router.push('/history')} />
          <QuickAction icon="call" label={t('quickCall')} tone="cyan" onPress={call} disabled={!ward.braceletPhone} />
        </ScrollView>
      </Appear>

      <Appear index={4}>
        <Card tone={device?.worn === false ? 'danger' : 'default'} style={s.bracelet}>
          <IconCircle name="watch" tone={device?.connected ? 'lavender' : 'neutral'} />
          <View style={s.flex}>
            <AppText variant="captionStrong" tone="muted">{t('braceletStatus')}</AppText>
            {!device ? (
              <AppText variant="bodyStrong" tone="danger">{t('deviceUnavailable')}</AppText>
            ) : (
              <>
                <AppText variant="bodyStrong">
                  {t(device.connected ? 'connected' : 'disconnected')} · {t(device.worn === false ? 'removed' : device.worn === true ? 'worn' : 'wearUnavailable')}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {t('battery')} {device.battery ?? '—'}% · {t('lastSync')}: {readableTime(device.lastSyncAt, t('unavailable'))}
                </AppText>
                <AppText variant="caption" tone="muted">{t('prototypeState')}</AppText>
              </>
            )}
          </View>
        </Card>
      </Appear>

      <Appear index={5}>
        <SectionHeader title={t('recentEvents')} action={t('viewAll')} onAction={() => router.push('/history' as Href)} />
      </Appear>
      {eventsLoading ? (
        <SkeletonList count={3} label={t('loadingEvents')} />
      ) : eventsError ? (
        <EmptyState icon="cloud-offline" tone="danger" title={t('eventsError')} />
      ) : events.length ? (
        <View style={s.list}>
          {events.map((event, i) => (
            <Appear key={event.id} index={6 + i}>
              <EventRow event={event} />
            </Appear>
          ))}
        </View>
      ) : (
        <Appear index={6}><EmptyState icon="sparkles" title={t('noEvents')} /></Appear>
      )}
    </ScreenScroll>
  );
}

function Header({ greeting, subtitle, wardName, unread, onBell }: {
  greeting: string; subtitle?: string; wardName?: string; unread?: boolean; onBell?: () => void;
}) {
  const { t } = useLocalization();
  const s = useStyles();
  return (
    <GradientHeader>
      <View style={s.headerTop}>
        {wardName ? <Avatar name={wardName} size={48} /> : <View />}
        {onBell ? (
          <IconButton icon="notifications-outline" badge={unread} onPress={onBell} accessibilityLabel={unread ? t('notificationsUnread') : t('notifications')} />
        ) : null}
      </View>
      <Appear>
        <AppText variant="display" accessibilityRole="header" style={s.greeting}>{greeting}</AppText>
        {subtitle ? <AppText variant="bodyMedium" tone="secondary">{subtitle}</AppText> : null}
      </Appear>
    </GradientHeader>
  );
}

function HomeSkeleton({ label }: { label: string }) {
  const s = useStyles();
  return (
    <ScreenScroll tabbed header={<GradientHeader><View style={s.skeletonHeader}><Skeleton width={54} height={54} radius={27} /><Skeleton width="70%" height={30} /></View></GradientHeader>}>
      <View accessible accessibilityLabel={label} accessibilityState={{ busy: true }} style={s.list}>
        <Skeleton height={200} radius={28} />
        <View style={s.rings}>
          <Skeleton height={130} radius={24} style={s.flex} />
          <Skeleton height={130} radius={24} style={s.flex} />
          <Skeleton height={130} radius={24} style={s.flex} />
        </View>
        <SkeletonList count={3} label={label} />
      </View>
    </ScreenScroll>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: t.spacing.lg },
  greeting: { marginBottom: t.spacing.xxs },
  skeletonHeader: { gap: t.spacing.md, paddingTop: t.spacing.xs },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, padding: t.spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  heroLabel: { flex: 1, opacity: 0.9 },
  heroStatus: { marginTop: t.spacing.md },
  heroAddress: { marginTop: t.spacing.xxs, opacity: 0.92 },
  heroBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.sm, marginTop: t.spacing.lg, flexWrap: 'wrap' },
  rings: { flexDirection: 'row', gap: t.spacing.sm },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  quickScroll: { marginHorizontal: -t.spacing.screen },
  quick: { gap: t.spacing.sm, paddingHorizontal: t.spacing.screen, paddingVertical: t.spacing.xxs },
  bracelet: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  list: { gap: t.spacing.sm },
}));
