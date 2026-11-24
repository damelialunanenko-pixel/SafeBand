/**
 * Medication schedule logic. Pure functions only (no React, Firebase or expo-notifications),
 * covered by __tests__/medication-schedule.test.ts.
 *
 * Conventions:
 * - times are "HH:mm" in the phone's local time zone;
 * - days are JS weekdays (Date#getDay): 0 = Sunday … 6 = Saturday;
 * - dates are local ISO dates "YYYY-MM-DD";
 * - a dose's log document ID is `doseKey()` — deterministic, so marking a dose twice overwrites.
 */
import type { MealRelation, Medication, MedicationForm, MedicationLog, MedicationLogStatus } from '@/types/care';
import { parseDateInput, type FieldErrors } from './validation';

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS = [1, 2, 3, 4, 5];
/** Display order Monday → Sunday. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const MEDICATION_FORMS: MedicationForm[] = ['tablet', 'capsule', 'drops', 'syrup', 'injection', 'ointment', 'inhaler', 'other'];
export const MEAL_RELATIONS: MealRelation[] = ['before', 'with', 'after', 'any'];
export const LOW_STOCK = 5;
/** A dose without a mark becomes "missed" this long after its time. */
export const MISSED_AFTER_MS = 3 * 60 * 60 * 1000;
export const FOLLOW_UP_MS = 30 * 60 * 1000;
export const SNOOZE_MS = 10 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

// ---------------------------------------------------------------- time and dates

export const isValidTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export const timeOf = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
export const sortTimes = (times: string[]) => [...times].sort();
export const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** The given day at "HH:mm" local time. */
export function atTime(day: Date, time: string) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

export const doseKey = (medicationId: string, scheduledAt: Date) =>
  `${medicationId}_${dayKey(scheduledAt).replace(/-/g, '')}_${timeOf(scheduledAt).replace(':', '')}`;

// ---------------------------------------------------------------- doses

export type Dose = { medication: Medication; time: string; scheduledAt: Date; key: string };

export function isScheduledOn(med: Medication, day: Date) {
  if (!med.enabled) return false;
  const days = med.days?.length ? med.days : ALL_DAYS;
  if (!days.includes(day.getDay())) return false;
  const key = dayKey(day);
  if (med.startDate && key < med.startDate) return false;
  if (med.endDate && key > med.endDate) return false;
  return true;
}

export function dosesOnDay(meds: Medication[], day: Date): Dose[] {
  const doses: Dose[] = [];
  for (const medication of meds) {
    if (!isScheduledOn(medication, day)) continue;
    for (const time of medication.times ?? []) {
      if (!isValidTime(time)) continue;
      const scheduledAt = atTime(day, time);
      doses.push({ medication, time, scheduledAt, key: doseKey(medication.id, scheduledAt) });
    }
  }
  return doses.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime() || a.medication.name.localeCompare(b.medication.name));
}

/** Doses with `from <= scheduledAt < to`. */
export function dosesBetween(meds: Medication[], from: Date, to: Date): Dose[] {
  const out: Dose[] = [];
  for (let day = startOfDay(from); day < to; day = addDays(day, 1)) {
    for (const dose of dosesOnDay(meds, day)) {
      if (dose.scheduledAt >= from && dose.scheduledAt < to) out.push(dose);
    }
  }
  return out;
}

export type DoseState = MedicationLogStatus | 'due' | 'upcoming';

export function doseState(dose: Dose, log: Pick<MedicationLog, 'status'> | undefined, now: Date): DoseState {
  if (log) return log.status;
  const diff = now.getTime() - dose.scheduledAt.getTime();
  if (diff < 0) return 'upcoming';
  return diff < MISSED_AFTER_MS ? 'due' : 'missed';
}

export type LogsByKey = Record<string, Pick<MedicationLog, 'status'>>;

/** The dose to show as "next": the earliest unmarked one that is due or upcoming (today or tomorrow). */
export function nextDose(meds: Medication[], logs: LogsByKey, now: Date): Dose | null {
  const doses = dosesBetween(meds, startOfDay(now), addDays(startOfDay(now), 2));
  return doses.find((d) => {
    const state = doseState(d, logs[d.key], now);
    return state === 'due' || state === 'upcoming';
  }) ?? null;
}

export type WeekStats = { taken: number; skipped: number; missed: number; total: number };

/** Statistics for the last 7 days (6 full days + today up to `now`). Doses still "due" are not counted. */
export function weekStats(meds: Medication[], logs: LogsByKey, now: Date): WeekStats {
  const stats: WeekStats = { taken: 0, skipped: 0, missed: 0, total: 0 };
  for (const dose of dosesBetween(meds, addDays(startOfDay(now), -6), now)) {
    const state = doseState(dose, logs[dose.key], now);
    if (state === 'taken' || state === 'skipped' || state === 'missed') { stats[state] += 1; stats.total += 1; }
  }
  return stats;
}

export const isLowStock = (med: Pick<Medication, 'stock'>) => typeof med.stock === 'number' && med.stock <= LOW_STOCK;

// ---------------------------------------------------------------- form

export type MedicationFormState = {
  name: string; dose: string; form: string; times: string[];
  days: number[]; startDate: string; endDate: string;
  mealRelation: string; note: string; stock: string; enabled: boolean;
};

export const emptyMedicationForm = (): MedicationFormState => ({
  name: '', dose: '', form: 'tablet', times: [], days: [...ALL_DAYS], startDate: '', endDate: '',
  mealRelation: 'any', note: '', stock: '', enabled: true,
});

export function validateMedicationForm(f: MedicationFormState): FieldErrors<keyof MedicationFormState> {
  const name = f.name.trim();
  const start = f.startDate.trim() ? parseDateInput(f.startDate) : null;
  const end = f.endDate.trim() ? parseDateInput(f.endDate) : null;
  const stock = f.stock.trim();
  return {
    name: !name ? 'errRequired' : name.length < 2 || name.length > 60 ? 'errMedName' : null,
    dose: f.dose.trim().length > 30 ? 'errTooLong' : null,
    form: MEDICATION_FORMS.includes(f.form as MedicationForm) ? null : 'errChoose',
    times: !f.times.length ? 'errMedTimes'
      : f.times.some((t) => !isValidTime(t)) ? 'errMedTimeFormat'
      : new Set(f.times).size !== f.times.length ? 'errMedTimesDuplicate' : null,
    days: f.days.length ? null : 'errChooseOne',
    startDate: f.startDate.trim() && !start ? 'errDateFormat' : null,
    endDate: f.endDate.trim() && !end ? 'errDateFormat' : start && end && end < start ? 'errMedEndBeforeStart' : null,
    mealRelation: MEAL_RELATIONS.includes(f.mealRelation as MealRelation) ? null : 'errChoose',
    note: f.note.trim().length > 200 ? 'errTooLong' : null,
    stock: stock && !/^\d{1,4}$/.test(stock) ? 'errMedStock' : null,
  };
}

/** Form → Firestore fields (without id/timestamps). Empty optionals become `null` so edits can clear them. */
export function medicationToDoc(f: MedicationFormState): Omit<Medication, 'id'> {
  return {
    name: f.name.trim().replace(/\s+/g, ' '),
    dose: f.dose.trim(),
    form: f.form as MedicationForm,
    times: sortTimes([...new Set(f.times)]),
    days: [...new Set(f.days)].sort(),
    startDate: f.startDate.trim() ? parseDateInput(f.startDate) : null,
    endDate: f.endDate.trim() ? parseDateInput(f.endDate) : null,
    mealRelation: f.mealRelation as MealRelation,
    note: f.note.trim(),
    stock: f.stock.trim() ? Number(f.stock) : null,
    enabled: f.enabled,
  };
}

// ---------------------------------------------------------------- reminder planning

export type ReminderTrigger =
  | { type: 'daily'; hour: number; minute: number }
  | { type: 'weekly'; weekday: number; hour: number; minute: number } // expo weekday: 1 = Sunday … 7 = Saturday
  | { type: 'date'; date: number };

export type ReminderPlan = {
  id: string;
  kind: 'dose' | 'followUp';
  medicationId: string;
  time: string;
  /** Set for one-off reminders; repeating ones get the date from the delivered notification. */
  scheduledAt?: number;
  trigger: ReminderTrigger;
  /** Next delivery time, used to keep only the nearest reminders. */
  nextAt: number;
};

export const REMINDER_PREFIX = 'safeband-med:';
export const followUpId = (key: string) => `${REMINDER_PREFIX}follow:${key}`;
export const snoozeId = (key: string) => `${REMINDER_PREFIX}snooze:${key}`;

const nextOccurrence = (now: Date, time: string, days: number[]) => {
  for (let i = 0; i < 8; i += 1) {
    const day = addDays(startOfDay(now), i);
    const at = atTime(day, time);
    if (days.includes(day.getDay()) && at > now) return at.getTime();
  }
  return Number.POSITIVE_INFINITY;
};

/**
 * All reminders for the enabled medications, nearest first, at most `limit` (iOS keeps only 64
 * scheduled notifications per app; a few are left for snoozes and the test notification).
 *
 * - Medications without a date range → repeating DAILY (every day) or WEEKLY (per chosen day) reminders.
 * - Medications with a start in the future or an end date → one-off reminders for the next `boundedDays`
 *   days, so they stop when the course ends.
 * - "Not marked" follow-ups 30 min after each dose in the next `followUpHours`, skipping doses already marked.
 */
export function planReminders(meds: Medication[], logs: LogsByKey, now: Date, { limit = 60, boundedDays = 7, followUpHours = 48 } = {}): ReminderPlan[] {
  const plans: ReminderPlan[] = [];
  const today = dayKey(now);

  for (const med of meds) {
    if (!med.enabled) continue;
    const days = med.days?.length ? [...new Set(med.days)] : ALL_DAYS;
    const bounded = Boolean(med.endDate) || Boolean(med.startDate && med.startDate > today);
    if (bounded) continue; // handled below with one-off reminders
    for (const time of med.times ?? []) {
      if (!isValidTime(time)) continue;
      const [hour, minute] = time.split(':').map(Number);
      const base = { kind: 'dose' as const, medicationId: med.id, time };
      if (days.length === 7) {
        plans.push({ ...base, id: `${REMINDER_PREFIX}dose:${med.id}:${time}:daily`, trigger: { type: 'daily', hour, minute }, nextAt: nextOccurrence(now, time, ALL_DAYS) });
      } else {
        for (const day of days) {
          plans.push({ ...base, id: `${REMINDER_PREFIX}dose:${med.id}:${time}:w${day}`, trigger: { type: 'weekly', weekday: day + 1, hour, minute }, nextAt: nextOccurrence(now, time, [day]) });
        }
      }
    }
  }

  const boundedMeds = meds.filter((m) => m.enabled && (m.endDate || (m.startDate && m.startDate > today)));
  for (const dose of dosesBetween(boundedMeds, now, addDays(startOfDay(now), boundedDays))) {
    const at = dose.scheduledAt.getTime();
    plans.push({ id: `${REMINDER_PREFIX}dose:${dose.key}`, kind: 'dose', medicationId: dose.medication.id, time: dose.time, scheduledAt: at, trigger: { type: 'date', date: at }, nextAt: at });
  }

  const followFrom = new Date(now.getTime() - FOLLOW_UP_MS);
  const followTo = new Date(now.getTime() + followUpHours * 60 * 60 * 1000);
  for (const dose of dosesBetween(meds, followFrom, followTo)) {
    const at = dose.scheduledAt.getTime() + FOLLOW_UP_MS;
    if (at <= now.getTime() || logs[dose.key]) continue;
    plans.push({ id: followUpId(dose.key), kind: 'followUp', medicationId: dose.medication.id, time: dose.time, scheduledAt: dose.scheduledAt.getTime(), trigger: { type: 'date', date: at }, nextAt: at });
  }

  return plans.sort((a, b) => a.nextAt - b.nextAt).slice(0, limit);
}

/** The dose a delivered reminder refers to. Repeating reminders carry only the time: use the delivery day. */
export function scheduledAtFor(data: { scheduledAt?: number; time?: string }, deliveredAt: Date): Date | null {
  if (typeof data.scheduledAt === 'number') return new Date(data.scheduledAt);
  if (!data.time || !isValidTime(data.time)) return null;
  const at = atTime(deliveredAt, data.time);
  // Delivered shortly after midnight for a late-evening dose? Then it belongs to the previous day.
  return at.getTime() - deliveredAt.getTime() > 12 * 60 * 60 * 1000 ? addDays(at, -1) : at;
}
