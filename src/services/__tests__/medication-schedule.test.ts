import type { Medication } from '@/types/care';
import {
  ALL_DAYS, WEEKDAYS, doseKey, doseState, dosesBetween, dosesOnDay, emptyMedicationForm, followUpId, isLowStock,
  isScheduledOn, medicationToDoc, nextDose, planReminders, scheduledAtFor, validateMedicationForm, weekStats,
} from '../medication-schedule';

const med = (over: Partial<Medication> = {}): Medication => ({
  id: 'm1', name: 'Мемантин', dose: '10 мг', form: 'tablet', times: ['08:00', '20:00'], days: ALL_DAYS,
  mealRelation: 'after', enabled: true, ...over,
});

// Wednesday 19 Nov 2025, 12:00 local time
const NOW = new Date(2025, 10, 19, 12, 0);

describe('doses', () => {
  it('lists the day sorted by time', () => {
    const doses = dosesOnDay([med({ times: ['20:00', '08:00'] }), med({ id: 'm2', name: 'Аспирин', times: ['14:00'] })], NOW);
    expect(doses.map((d) => `${d.time} ${d.medication.name}`)).toEqual(['08:00 Мемантин', '14:00 Аспирин', '20:00 Мемантин']);
  });

  it('respects days, enabled flag and the date range', () => {
    expect(isScheduledOn(med({ days: WEEKDAYS }), NOW)).toBe(true);
    expect(isScheduledOn(med({ days: [0, 6] }), NOW)).toBe(false);
    expect(isScheduledOn(med({ enabled: false }), NOW)).toBe(false);
    expect(isScheduledOn(med({ startDate: '2025-11-20' }), NOW)).toBe(false);
    expect(isScheduledOn(med({ endDate: '2025-11-18' }), NOW)).toBe(false);
    expect(isScheduledOn(med({ startDate: '2025-11-19', endDate: '2025-11-19' }), NOW)).toBe(true);
  });

  it('builds deterministic log keys', () => {
    expect(doseKey('m1', new Date(2025, 10, 19, 8, 5))).toBe('m1_20251119_0805');
  });

  it('computes the state of a dose', () => {
    const [morning, evening] = dosesOnDay([med()], NOW);
    expect(doseState(evening, undefined, NOW)).toBe('upcoming');
    expect(doseState(morning, undefined, new Date(2025, 10, 19, 9, 0))).toBe('due');
    expect(doseState(morning, undefined, NOW)).toBe('missed');
    expect(doseState(morning, { status: 'taken' }, NOW)).toBe('taken');
  });

  it('finds the next unmarked dose, rolling over to tomorrow', () => {
    expect(nextDose([med()], {}, NOW)?.time).toBe('20:00');
    const evening = new Date(2025, 10, 19, 20, 0);
    expect(nextDose([med()], { [doseKey('m1', evening)]: { status: 'taken' } }, new Date(2025, 10, 19, 21, 0))?.scheduledAt).toEqual(new Date(2025, 10, 20, 8, 0));
    expect(nextDose([med({ enabled: false })], {}, NOW)).toBeNull();
  });

  it('counts the last 7 days', () => {
    const logs = { [doseKey('m1', new Date(2025, 10, 19, 8, 0))]: { status: 'taken' as const }, [doseKey('m1', new Date(2025, 10, 18, 20, 0))]: { status: 'skipped' as const } };
    // 6 full days × 2 doses + today's 08:00 = 13 doses; today's 20:00 is in the future.
    expect(weekStats([med()], logs, NOW)).toEqual({ taken: 1, skipped: 1, missed: 11, total: 13 });
  });

  it('spans days', () => {
    expect(dosesBetween([med()], new Date(2025, 10, 19, 12), new Date(2025, 10, 20, 12)).map((d) => d.key)).toEqual(['m1_20251119_2000', 'm1_20251120_0800']);
  });

  it('flags low stock at 5 or less', () => {
    expect(isLowStock({ stock: 5 })).toBe(true);
    expect(isLowStock({ stock: 6 })).toBe(false);
    expect(isLowStock({ stock: null })).toBe(false);
  });
});

describe('form', () => {
  const valid = { ...emptyMedicationForm(), name: 'Мемантин', times: ['08:00'] };
  const errorsOf = (over: Partial<typeof valid>) => validateMedicationForm({ ...valid, ...over });

  it('accepts a minimal valid form', () => {
    expect(Object.values(errorsOf({})).every((e) => !e)).toBe(true);
  });
  it.each([
    [{ name: '' }, 'name', 'errRequired'],
    [{ name: 'А' }, 'name', 'errMedName'],
    [{ name: 'x'.repeat(61) }, 'name', 'errMedName'],
    [{ times: [] }, 'times', 'errMedTimes'],
    [{ times: ['08:00', '08:00'] }, 'times', 'errMedTimesDuplicate'],
    [{ times: ['25:00'] }, 'times', 'errMedTimeFormat'],
    [{ days: [] }, 'days', 'errChooseOne'],
    [{ startDate: '31.02.2025' }, 'startDate', 'errDateFormat'],
    [{ startDate: '10.11.2025', endDate: '01.11.2025' }, 'endDate', 'errMedEndBeforeStart'],
    [{ stock: '-1' }, 'stock', 'errMedStock'],
    [{ stock: '1.5' }, 'stock', 'errMedStock'],
  ])('rejects %p', (over, field, error) => {
    expect(errorsOf(over)[field as keyof typeof valid]).toBe(error);
  });

  it('maps to a document', () => {
    expect(medicationToDoc({ ...valid, name: ' Мемантин  форте ', times: ['20:00', '08:00'], days: [5, 1], endDate: '01.12.2025', stock: '30' })).toEqual({
      name: 'Мемантин форте', dose: '', form: 'tablet', times: ['08:00', '20:00'], days: [1, 5], startDate: null, endDate: '2025-12-01',
      mealRelation: 'any', note: '', stock: 30, enabled: true,
    });
  });
});

describe('planReminders', () => {
  it('uses one DAILY reminder per time for every-day medications', () => {
    const plans = planReminders([med()], {}, NOW, { followUpHours: 0 });
    expect(plans.map((p) => [p.id, p.trigger])).toEqual([
      ['safeband-med:dose:m1:20:00:daily', { type: 'daily', hour: 20, minute: 0 }],
      ['safeband-med:dose:m1:08:00:daily', { type: 'daily', hour: 8, minute: 0 }],
    ]);
  });

  it('uses WEEKLY reminders with expo weekdays (1 = Sunday) for chosen days', () => {
    const plans = planReminders([med({ times: ['09:30'], days: [1, 3] })], {}, NOW, { followUpHours: 0 });
    expect(plans.map((p) => p.trigger)).toEqual([
      { type: 'weekly', weekday: 2, hour: 9, minute: 30 }, // next Monday
      { type: 'weekly', weekday: 4, hour: 9, minute: 30 }, // Wednesday next week (today's 09:30 has passed)
    ]);
  });

  it('uses one-off reminders for a course with an end date', () => {
    const plans = planReminders([med({ times: ['08:00'], endDate: '2025-11-21' })], {}, NOW, { followUpHours: 0 });
    expect(plans.map((p) => p.trigger)).toEqual([
      { type: 'date', date: new Date(2025, 10, 20, 8).getTime() },
      { type: 'date', date: new Date(2025, 10, 21, 8).getTime() },
    ]);
  });

  it('adds follow-ups 30 min after unmarked doses only', () => {
    const now = new Date(2025, 10, 19, 7, 0);
    const taken = { [doseKey('m1', new Date(2025, 10, 19, 8))]: { status: 'taken' as const } };
    const follow = planReminders([med()], taken, now, { followUpHours: 24 }).filter((p) => p.kind === 'followUp');
    expect(follow.map((p) => p.id)).toEqual([followUpId('m1_20251119_2000')]);
    expect(follow[0].trigger).toEqual({ type: 'date', date: new Date(2025, 10, 19, 20, 30).getTime() });
  });

  it('keeps only the nearest reminders within the limit', () => {
    const many = Array.from({ length: 10 }, (_, i) => med({ id: `m${i}`, times: ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '13:00'], days: [1, 2, 3, 4, 5] }));
    const plans = planReminders(many, {}, NOW, { limit: 60 });
    expect(plans).toHaveLength(60);
    expect(plans.every((p, i) => i === 0 || plans[i - 1].nextAt <= p.nextAt)).toBe(true);
  });
});

describe('scheduledAtFor', () => {
  it('prefers the explicit time and otherwise uses the delivery day', () => {
    expect(scheduledAtFor({ scheduledAt: 123 }, NOW)).toEqual(new Date(123));
    expect(scheduledAtFor({ time: '08:00' }, new Date(2025, 10, 19, 8, 0, 3))).toEqual(new Date(2025, 10, 19, 8, 0));
    expect(scheduledAtFor({ time: '23:50' }, new Date(2025, 10, 20, 0, 5))).toEqual(new Date(2025, 10, 19, 23, 50));
    expect(scheduledAtFor({ time: 'bad' }, NOW)).toBeNull();
  });
});
