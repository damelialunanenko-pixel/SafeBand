import { assessLocation } from '@/services/care-logic';
import { dayBucket, locationChip, locationStatusText, toDate } from '../format';

const t = (key: string, values: Record<string, string | number> = {}) =>
  `${key}${Object.keys(values).length ? `(${Object.values(values).join(',')})` : ''}`;

describe('dayBucket', () => {
  const now = new Date(2026, 10, 21, 15, 0);
  it('groups by calendar day', () => {
    expect(dayBucket(new Date(2026, 10, 21, 0, 5), now)).toBe('today');
    expect(dayBucket(new Date(2026, 10, 20, 23, 59), now)).toBe('yesterday');
    expect(dayBucket(new Date(2026, 10, 20, 0, 0), now)).toBe('yesterday');
    expect(dayBucket(new Date(2026, 10, 19, 23, 59), now)).toBe('earlier');
    expect(dayBucket(null, now)).toBe('earlier');
  });
});

describe('toDate', () => {
  it('accepts Firestore-like timestamps, millis and rejects garbage', () => {
    const d = new Date(2026, 0, 1);
    expect(toDate({ toDate: () => d })).toBe(d);
    expect(toDate(d.getTime())?.getTime()).toBe(d.getTime());
    expect(toDate('not a date')).toBeNull();
    expect(toDate(undefined)).toBeNull();
  });
});

describe('location status', () => {
  const home = { id: 'h', name: 'Home', location: { lat: 51.1694, lng: 71.4491 }, radius: 50 };
  it('maps assessLocation statuses to translation keys', () => {
    expect(locationStatusText(assessLocation(undefined), t as never)).toBe('locationUnavailable');
    expect(locationStatusText(assessLocation(home.location, [home]), t as never)).toBe('atPlace(Home)');
    expect(locationStatusText(assessLocation({ lat: 51.2, lng: 71.5 }, [home]), t as never)).toBe('outsideSafeArea');
  });
  it('picks the chip tone', () => {
    expect(locationChip(assessLocation(home.location, [home]), t as never).tone).toBe('success');
    expect(locationChip(assessLocation({ lat: 51.2, lng: 71.5 }, [home]), t as never).tone).toBe('warning');
  });
});
