import type { IconName, IconTone } from '@/components/ui';
import type { Language, useLocalization } from '@/localization';
import type { LocationAssessment } from '@/services/care-logic';
import type { CareEvent } from '@/types/care';

type T = ReturnType<typeof useLocalization>['t'];

const LOCALES: Record<Language, string> = { ru: 'ru-RU', en: 'en-GB', kk: 'kk-KZ' };

/** Firestore Timestamp | Date | ISO string | millis → Date, or null when invalid. */
export function toDate(value: unknown): Date | null {
  const v = value as { toDate?: () => Date } | string | number | Date | null | undefined;
  const d = (typeof v === 'object' && v && 'toDate' in v && typeof v.toDate === 'function') ? v.toDate() : v ? new Date(v as string | number | Date) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

/** Full date and time, as the screens showed before the redesign. */
export function readableTime(value: unknown, fallback: string) {
  return toDate(value)?.toLocaleString() ?? fallback;
}

/** “14:05” for today, “12 Mar, 14:05” otherwise — for the right column of list rows. */
export function shortTime(value: unknown, fallback: string, language: Language) {
  const d = toDate(value);
  if (!d) return fallback;
  const locale = LOCALES[language];
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (dayBucket(d) === 'today') return time;
  return `${d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}, ${time}`;
}

export type DayBucket = 'today' | 'yesterday' | 'earlier';

export function dayBucket(d: Date | null, now = new Date()): DayBucket {
  if (!d) return 'earlier';
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d.getTime() >= start) return 'today';
  if (d.getTime() >= start - 86_400_000) return 'yesterday';
  return 'earlier';
}

/** Localized text for `assessLocation().status` (the logic returns English sentences). */
export function locationStatusText(a: LocationAssessment, t: T) {
  if (a.status === 'Location unavailable') return t('locationUnavailable');
  if (a.expectedPlace && a.status.startsWith('Expected at')) return t('expectedAt', { name: a.expectedPlace.name });
  if (a.matchedPlace && a.status.startsWith('At ')) return t('atPlace', { name: a.matchedPlace.name });
  if (a.status === 'On safe route') return t('onSafeRoute');
  if (a.status === 'Outside safe route') return t('outsideSafeRoute');
  if (a.status === 'Outside safe area') return t('outsideSafeArea');
  return a.status;
}

/** Chip for the location state: «Безопасно» / «В пути» / «Внимание». */
export function locationChip(a: LocationAssessment, t: T): { label: string; tone: IconTone; icon: IconName } {
  if (a.status === 'On safe route') return { label: t('onTheWay'), tone: 'primary', icon: 'walk' };
  if (a.safe) return { label: t('safe'), tone: 'success', icon: 'shield-checkmark' };
  return { label: t('attention'), tone: 'warning', icon: 'warning' };
}

const CATEGORY: Record<CareEvent['category'], { icon: IconName; tone: IconTone }> = {
  location: { icon: 'location', tone: 'primary' },
  health: { icon: 'heart', tone: 'success' },
  bracelet: { icon: 'watch', tone: 'lavender' },
  sos: { icon: 'alert-circle', tone: 'danger' },
  alert: { icon: 'notifications', tone: 'warning' },
};

/** Icon and colour for an event row; severity overrides the category colour. */
export function eventVisual(e: CareEvent): { icon: IconName; tone: IconTone } {
  const base = CATEGORY[e.category] ?? { icon: 'ellipse', tone: 'neutral' };
  if (e.severity === 'critical') return { icon: base.icon, tone: 'danger' };
  if (e.severity === 'warning') return { icon: base.icon, tone: 'warning' };
  return base;
}
