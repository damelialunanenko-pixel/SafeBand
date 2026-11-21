import { Chip, ListItem } from '@/components/ui';
import { useLocalization } from '@/localization';
import type { CareEvent } from '@/types/care';
import { eventVisual, shortTime } from './format';

/** An event as a list row: category icon, description, time on the right, severity tag when not “info”. */
export function EventRow({ event, onPress }: { event: CareEvent; onPress?: () => void }) {
  const { t, language } = useLocalization();
  const { icon, tone } = eventVisual(event);
  const time = shortTime(event.createdAt, t('timeUnavailable'), language);
  return (
    <ListItem
      icon={icon}
      iconTone={tone}
      title={event.description}
      meta={time}
      metaAccent={event.severity !== 'info' ? <Chip label={t(event.severity)} tone={event.severity === 'critical' ? 'danger' : 'warning'} /> : undefined}
      critical={event.severity === 'critical'}
      onPress={onPress}
      accessibilityLabel={`${event.description}. ${t(event.severity)}. ${time}`}
    />
  );
}
