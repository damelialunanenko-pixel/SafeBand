import { ScrollView, View } from 'react-native';
import { useState } from 'react';
import { EventRow } from '@/components/care/event-row';
import { dayBucket, toDate, type DayBucket } from '@/components/care/format';
import {
  Appear, EmptyState, FilterChip, GradientHeader, ScreenScroll, SectionHeader, SkeletonList, TopBar, type IconName,
} from '@/components/ui';
import { usePrimaryCareData } from '@/hooks/use-care-data';
import { useLiveRefresh } from '@/hooks/use-refresh';
import { useWardEvents } from '@/hooks/use-ward-events';
import { useLocalization } from '@/localization';
import { makeStyles } from '@/theme';
import type { CareEvent } from '@/types/care';

const filters = ['All', 'Location', 'Health', 'Bracelet', 'SOS', 'Alerts'] as const;
type Filter = (typeof filters)[number];
const categories: Record<Exclude<Filter, 'All'>, CareEvent['category']> = {
  Location: 'location', Health: 'health', Bracelet: 'bracelet', SOS: 'sos', Alerts: 'alert',
};
const FILTER_ICONS: Record<Filter, IconName> = {
  All: 'apps', Location: 'location', Health: 'heart', Bracelet: 'watch', SOS: 'alert-circle', Alerts: 'notifications',
};
const BUCKETS: DayBucket[] = ['today', 'yesterday', 'earlier'];

export default function History() {
  const { t } = useLocalization();
  const s = useStyles();
  const { ward } = usePrimaryCareData();
  const { events, loading, error } = useWardEvents(ward);
  const [filter, setFilter] = useState<Filter>('All');
  const { refreshing, onRefresh } = useLiveRefresh();

  const filterLabel = (f: Filter) =>
    f === 'All' ? t('all') : f === 'Alerts' ? t('alerts') : f === 'Location' ? t('location') : f === 'Health' ? t('health') : f === 'Bracelet' ? t('braceletStatus') : f;

  const shown = filter === 'All' ? events : events.filter((e) => e.category === categories[filter]);
  const groups = BUCKETS
    .map((bucket) => ({ bucket, items: shown.filter((e) => dayBucket(toDate(e.createdAt)) === bucket) }))
    .filter((g) => g.items.length > 0);

  let row = 0;
  return (
    <ScreenScroll
      refreshing={refreshing}
      onRefresh={onRefresh}
      header={
        <GradientHeader style={s.header}>
          <TopBar title={t('eventHistory')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters} style={s.filterScroll} accessibilityRole="radiogroup">
            {filters.map((f) => (
              <FilterChip key={f} label={filterLabel(f)} icon={FILTER_ICONS[f]} selected={filter === f} onPress={() => setFilter(f)} />
            ))}
          </ScrollView>
        </GradientHeader>
      }
    >
      {loading ? (
        <SkeletonList count={5} label={t('loadingEvents')} />
      ) : error ? (
        <EmptyState icon="cloud-offline" tone="danger" title={t('eventsError')} />
      ) : groups.length ? (
        groups.map((g) => (
          <View key={g.bucket} style={s.group}>
            <Appear index={row++}><SectionHeader title={t(g.bucket)} /></Appear>
            {g.items.map((e) => <Appear key={e.id} index={row++}><EventRow event={e} /></Appear>)}
          </View>
        ))
      ) : (
        <Appear><EmptyState icon="sparkles" title={t('noEvents')} /></Appear>
      )}
    </ScreenScroll>
  );
}

const useStyles = makeStyles((t) => ({
  header: { paddingBottom: t.spacing.md },
  filterScroll: { marginHorizontal: -t.spacing.screen, marginTop: t.spacing.sm },
  filters: { gap: t.spacing.xs, paddingHorizontal: t.spacing.screen, paddingVertical: 4 },
  group: { gap: t.spacing.sm },
}));
