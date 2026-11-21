import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { AreaChart, type ChartPoint } from '@/components/care/area-chart';
import { readableTime, shortTime, toDate } from '@/components/care/format';
import {
  AnimatedNumber, Appear, AppText, Card, EmptyState, GradientHeader, IconCircle, ListItem, ScreenScroll, SectionHeader,
  SegmentedControl, Skeleton, SkeletonList, TopBar,
} from '@/components/ui';
import { DEFAULT_HEALTH_THRESHOLDS } from '@/config/care';
import { usePrimaryCareData } from '@/hooks/use-care-data';
import { useLocalization } from '@/localization';
import { db } from '@/services/firebase';
import { makeStyles, useAppTheme } from '@/theme';

type Reading = { id: string; heartRate?: number; spo2?: number; recordedAt?: unknown };
type Range = '24h' | '7d' | '30d';
type Metric = 'heartRate' | 'spo2';

const RANGES: Range[] = ['24h', '7d', '30d'];
/** Rows after this index render without an entrance animation (lists can hold hundreds of readings). */
const ANIMATED_ROWS = 12;

export default function HealthScreen() {
  const { t, language } = useLocalization();
  const { colors } = useAppTheme();
  const s = useStyles();
  const { ward, device } = usePrimaryCareData();
  const [range, setRange] = useState<Range>('24h');
  const [metric, setMetric] = useState<Metric>('heartRate');
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ward) return;
    return onSnapshot(
      query(collection(db, 'healthReadings'), where('wardId', '==', ward.id), orderBy('recordedAt', 'desc'), limit(range === '24h' ? 96 : range === '7d' ? 168 : 720)),
      (snap) => { setReadings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reading))); setLoading(false); },
      (e) => { setError(e.message); setLoading(false); },
    );
  }, [ward, range]);

  const thresholds = ward?.healthThresholds ?? DEFAULT_HEALTH_THRESHOLDS;
  const unit = metric === 'heartRate' ? 'BPM' : '%';

  // Chronological points for the selected metric.
  const points = useMemo<ChartPoint[]>(() => readings
    .map((r) => ({ t: toDate(r.recordedAt)?.getTime(), y: r[metric] }))
    .filter((p): p is ChartPoint => typeof p.t === 'number' && typeof p.y === 'number')
    .reverse(), [readings, metric]);
  const stats = points.length ? {
    avg: Math.round(points.reduce((sum, p) => sum + p.y, 0) / points.length),
    min: Math.min(...points.map((p) => p.y)),
    max: Math.max(...points.map((p) => p.y)),
  } : null;

  const hrAlert = typeof device?.heartRate === 'number' && (device.heartRate < thresholds.minHeartRate || device.heartRate > thresholds.maxHeartRate);
  const spo2Alert = typeof device?.spo2 === 'number' && device.spo2 < thresholds.minSpo2;
  const chartColor = metric === 'heartRate' ? colors.primary : colors.cyan;

  return (
    <ScreenScroll
      tabbed
      header={
        <GradientHeader>
          <TopBar title={t('healthHistory')} back={false} />
          <Appear style={s.current}>
            <Card style={s.metric} tone={hrAlert ? 'danger' : 'default'} accessibilityLabel={`${t('heartRate')}: ${device?.heartRate ?? '—'} BPM`}>
              <IconCircle name="heart" tone={hrAlert ? 'danger' : 'lavender'} size={40} />
              <View style={s.metricValue}>
                <AnimatedNumber value={device?.heartRate} variant="h1" tone={hrAlert ? 'danger' : 'default'} />
                <AppText variant="captionStrong" tone="muted"> BPM</AppText>
              </View>
              <AppText variant="caption" tone="secondary">{t('heartRate')}</AppText>
            </Card>
            <Card style={s.metric} tone={spo2Alert ? 'danger' : 'default'} accessibilityLabel={`${t('bloodOxygen')}: ${device?.spo2 ?? '—'}%`}>
              <IconCircle name="water" tone={spo2Alert ? 'danger' : 'cyan'} size={40} />
              <View style={s.metricValue}>
                <AnimatedNumber value={device?.spo2} variant="h1" tone={spo2Alert ? 'danger' : 'default'} />
                <AppText variant="captionStrong" tone="muted"> % SpO₂</AppText>
              </View>
              <AppText variant="caption" tone="secondary">{t('bloodOxygen')}</AppText>
            </Card>
          </Appear>
        </GradientHeader>
      }
    >
      <Appear index={1}>
        <SegmentedControl
          accessibilityLabel={t('period')}
          segments={RANGES.map((x) => ({ value: x, label: x }))}
          value={range}
          onChange={setRange}
        />
      </Appear>

      <Appear index={2}>
        <Card style={s.chartCard}>
          <View style={s.chartHead}>
            <View style={s.flex}>
              <AppText variant="title">{metric === 'heartRate' ? t('heartRate') : t('bloodOxygen')}</AppText>
              <AppText variant="caption" tone="muted">
                {t('thresholds', { min: thresholds.minHeartRate, max: thresholds.maxHeartRate, spo2: thresholds.minSpo2 })}
              </AppText>
            </View>
          </View>
          <SegmentedControl
            accessibilityLabel={t('chartMetric')}
            segments={[{ value: 'heartRate', label: t('pulseShort') }, { value: 'spo2', label: t('spo2Short') }]}
            value={metric}
            onChange={setMetric}
          />
          {loading ? (
            <Skeleton height={190} radius={16} />
          ) : points.length >= 2 ? (
            <AreaChart
              points={points}
              color={chartColor}
              formatValue={(y) => `${y} ${unit}`}
              formatTime={(ms) => shortTime(ms, '', language)}
              accessibilityLabel={stats ? `${t('average')} ${stats.avg} ${unit}, ${t('minimum')} ${stats.min}, ${t('maximum')} ${stats.max}` : t('noData')}
            />
          ) : (
            <AppText variant="caption" tone="muted" center style={s.noChart}>{t('noReadingsChart')}</AppText>
          )}
          {stats ? (
            <View style={s.stats}>
              <Stat label={t('average')} value={`${stats.avg}`} />
              <Stat label={t('minimum')} value={`${stats.min}`} />
              <Stat label={t('maximum')} value={`${stats.max}`} />
            </View>
          ) : null}
          <AppText variant="caption" tone="muted">
            {t('lastUpdated')}: {readableTime(readings[0]?.recordedAt ?? device?.location?.updatedAt, t('unavailable'))}
          </AppText>
        </Card>
      </Appear>

      <Appear index={3}><SectionHeader title={t('historicalReadings')} /></Appear>
      {loading ? (
        <SkeletonList count={4} label={t('loadingHealth')} />
      ) : error ? (
        <EmptyState icon="cloud-offline" tone="danger" title={t('healthError')} />
      ) : readings.length ? (
        <View style={s.list}>
          {readings.map((r, i) => {
            const row = (
              <ListItem
                icon="pulse"
                iconTone={(typeof r.heartRate === 'number' && (r.heartRate < thresholds.minHeartRate || r.heartRate > thresholds.maxHeartRate))
                  || (typeof r.spo2 === 'number' && r.spo2 < thresholds.minSpo2) ? 'danger' : 'primary'}
                title={`${r.heartRate ?? '—'} BPM · ${r.spo2 ?? '—'}% SpO₂`}
                subtitle={readableTime(r.recordedAt, t('timeUnavailable'))}
                meta={shortTime(r.recordedAt, '', language)}
              />
            );
            return i < ANIMATED_ROWS ? <Appear key={r.id} index={4 + i}>{row}</Appear> : <View key={r.id}>{row}</View>;
          })}
        </View>
      ) : (
        <EmptyState icon="heart-outline" title={t('noHealthData', { range })} />
      )}
    </ScreenScroll>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const s = useStyles();
  return (
    <View style={s.stat}>
      <AppText variant="h2">{value}</AppText>
      <AppText variant="caption" tone="muted">{label}</AppText>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  current: { flexDirection: 'row', gap: t.spacing.sm, marginTop: t.spacing.sm },
  metric: { flex: 1, gap: t.spacing.xs, padding: t.spacing.md },
  metricValue: { flexDirection: 'row', alignItems: 'baseline' },
  chartCard: { gap: t.spacing.md },
  chartHead: { flexDirection: 'row', alignItems: 'center' },
  noChart: { paddingVertical: t.spacing.xl },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: t.spacing.xs, borderRadius: t.radius.md, backgroundColor: t.colors.background, marginHorizontal: 4 },
  list: { gap: t.spacing.sm },
}));
