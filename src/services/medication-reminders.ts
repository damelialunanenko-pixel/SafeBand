import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility, IosAuthorizationStatus } from 'expo-notifications';
import { useSyncExternalStore } from 'react';
import { Linking, Platform, Vibration } from 'react-native';
import type { MealRelation, Medication } from '@/types/care';
import {
  LOW_STOCK, REMINDER_PREFIX, SNOOZE_MS, doseKey, followUpId, planReminders, scheduledAtFor, snoozeId,
  type LogsByKey, type ReminderPlan,
} from './medication-schedule';
import { markDose, type MarkResult } from './medications';

/**
 * Local medication reminders (expo-notifications; works in Expo Go — only local notifications).
 *
 * All our scheduled notifications have identifiers starting with REMINDER_PREFIX. Every sync cancels
 * them (except snoozes) and schedules the current plan again — on app start and whenever the
 * medications or logs change. See planReminders() for what is scheduled and the 64-notification
 * limit on iOS.
 */
export const CHANNEL_ID = 'medications';
export const CATEGORY_ID = 'medication-dose';
export const ACTION_TAKEN = 'taken';
export const ACTION_SNOOZE = 'snooze';
export const VIBRATION_PATTERN = [0, 500, 300, 500, 300, 500];
const SUPPORTED = Platform.OS !== 'web';
const ENABLED_KEY = 'safeband.medReminders.enabled';
const HANDLED_KEY = 'safeband.medReminders.handledResponses';

type T = (key: string, values?: Record<string, string | number>) => string;
export type ReminderData = { kind: 'med'; wardId: string; medicationId: string; time: string; scheduledAt?: number };

// ---------------------------------------------------------------- state (enabled switch + permission)

type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';
type State = { enabled: boolean | undefined; permission: PermissionState | undefined; canAskAgain: boolean };
let state: State = { enabled: undefined, permission: undefined, canAskAgain: true };
const listeners = new Set<() => void>();
const update = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
let loaded = false;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (!loaded) {
    loaded = true;
    AsyncStorage.getItem(ENABLED_KEY).then((v) => update({ enabled: v !== 'false' })).catch(() => update({ enabled: true }));
    void refreshPermission();
  }
  return () => { listeners.delete(listener); };
};

export const useReminderState = () => useSyncExternalStore(subscribe, () => state, () => state);

const toState = (p: Notifications.NotificationPermissionsStatus): PermissionState =>
  p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL ? 'granted' : p.status === 'denied' ? 'denied' : 'undetermined';

export async function refreshPermission() {
  if (!SUPPORTED) return update({ permission: 'unsupported', canAskAgain: false });
  try {
    const p = await Notifications.getPermissionsAsync();
    update({ permission: toState(p), canAskAgain: p.canAskAgain });
  } catch {
    update({ permission: 'unsupported', canAskAgain: false });
  }
}

export async function requestPermission() {
  if (!SUPPORTED) return false;
  await ensureChannel(); // Android 13+: the permission dialog appears only once a channel exists
  const p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  update({ permission: toState(p), canAskAgain: p.canAskAgain });
  return toState(p) === 'granted';
}

export async function setRemindersEnabled(enabled: boolean) {
  update({ enabled });
  try { await AsyncStorage.setItem(ENABLED_KEY, String(enabled)); } catch { /* ignore */ }
}

export const openSystemSettings = () => void Linking.openSettings();

// ---------------------------------------------------------------- setup

let channelReady = false;
let channelName = '';
async function ensureChannel(t?: T) {
  if (Platform.OS !== 'android') return;
  const name = t ? t('notifChannel') : channelName || 'Medications';
  if (channelReady && name === channelName) return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name,
    importance: AndroidImportance.MAX,
    sound: 'default',
    enableVibrate: true,
    vibrationPattern: VIBRATION_PATTERN,
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
  });
  channelReady = true;
  channelName = name;
}

let categoryLanguage = '';
/** Channel + action buttons. Called again when the language changes (button titles are localized). */
export async function setupNotifications(t: T, language: string) {
  if (!SUPPORTED) return;
  await ensureChannel(t);
  if (categoryLanguage === language) return;
  // Both actions open the app: a closed app can only run JS (write the log, schedule the snooze) that way.
  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    { identifier: ACTION_TAKEN, buttonTitle: t('notifTaken'), options: { opensAppToForeground: true } },
    { identifier: ACTION_SNOOZE, buttonTitle: t('notifSnooze'), options: { opensAppToForeground: true } },
  ]);
  categoryLanguage = language;
}

let handlerInstalled = false;
/** Show reminders while the app is open too. */
export function installForegroundHandler() {
  if (!SUPPORTED || handlerInstalled) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

export const isReminder = (data: unknown): data is ReminderData => (data as ReminderData | null)?.kind === 'med';

/** Extra vibration for a reminder that arrives while the app is open. */
export function vibrateForReminder() {
  Vibration.vibrate(VIBRATION_PATTERN);
}

// ---------------------------------------------------------------- content and scheduling

const MEAL_KEYS: Record<MealRelation, string> = { before: 'mealBefore', with: 'mealWith', after: 'mealAfter', any: 'mealAny' };
const nameWithDose = (m: Pick<Medication, 'name' | 'dose'>) => [m.name, m.dose].filter(Boolean).join(' ');

/** "Мемантин 10 мг — после еды" (+ "для Иванов Серик" on the next line). */
export function reminderBody(med: Pick<Medication, 'name' | 'dose' | 'mealRelation'>, wardName: string | undefined, t: T) {
  const meal = med.mealRelation && med.mealRelation !== 'any' ? ` — ${t(MEAL_KEYS[med.mealRelation])}` : '';
  return `${nameWithDose(med)}${meal}${wardName ? `\n${t('notifFor', { name: wardName })}` : ''}`;
}

function toTrigger(plan: ReminderPlan): Notifications.SchedulableNotificationTriggerInput {
  const channelId = CHANNEL_ID;
  const tr = plan.trigger;
  if (tr.type === 'daily') return { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: tr.hour, minute: tr.minute, channelId };
  if (tr.type === 'weekly') return { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: tr.weekday, hour: tr.hour, minute: tr.minute, channelId };
  return { type: Notifications.SchedulableTriggerInputTypes.DATE, date: tr.date, channelId };
}

const baseContent = (title: string, body: string, data: ReminderData): Notifications.NotificationContentInput => ({
  title, body, data, sound: 'default', categoryIdentifier: CATEGORY_ID,
  priority: Notifications.AndroidNotificationPriority.MAX, vibrate: VIBRATION_PATTERN,
});

let queue: Promise<unknown> = Promise.resolve();
/** Serialises syncs so two of them never interleave cancel/schedule calls. */
const serial = <R>(job: () => Promise<R>) => {
  const next = queue.then(job, job);
  queue = next.catch(() => undefined);
  return next;
};

export type SyncInput = { wardId: string; wardName?: string; meds: Medication[]; logs: LogsByKey; t: T };

/** Cancels our reminders (except snoozes) and schedules the current plan. Returns how many were scheduled. */
export const syncReminders = ({ wardId, wardName, meds, logs, t }: SyncInput) => serial(async () => {
  if (!SUPPORTED) return 0;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter((r) => r.identifier.startsWith(REMINDER_PREFIX));
  const snoozes = ours.filter((r) => r.identifier.startsWith(snoozeId('')));
  await Promise.all(ours.filter((r) => !snoozes.includes(r)).map((r) => Notifications.cancelScheduledNotificationAsync(r.identifier)));

  if (state.enabled === false || state.permission !== 'granted') return 0;
  const byId = new Map(meds.map((m) => [m.id, m]));
  const plans = planReminders(meds, logs, new Date(), { limit: 60 - snoozes.length });
  for (const plan of plans) {
    const med = byId.get(plan.medicationId);
    if (!med) continue;
    const data: ReminderData = { kind: 'med', wardId, medicationId: med.id, time: plan.time, ...(plan.scheduledAt ? { scheduledAt: plan.scheduledAt } : {}) };
    const content = plan.kind === 'dose'
      ? baseContent(t('notifTitle'), reminderBody(med, wardName, t), data)
      : baseContent(t('notifFollowTitle'), `${t('notifFollowBody', { name: nameWithDose(med), time: plan.time })}${wardName ? `\n${t('notifFor', { name: wardName })}` : ''}`, data);
    await Notifications.scheduleNotificationAsync({ identifier: plan.id, content, trigger: toTrigger(plan) });
  }
  return plans.length;
});

export const cancelAllReminders = () => serial(async () => {
  if (!SUPPORTED) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((r) => r.identifier.startsWith(REMINDER_PREFIX)).map((r) => Notifications.cancelScheduledNotificationAsync(r.identifier)));
});

/** Settings → "Test reminder": the same look as a real one, in 5 seconds. */
export async function sendTestReminder(t: T, wardName?: string) {
  if (!SUPPORTED) return false;
  await ensureChannel(t);
  if (state.permission !== 'granted' && !(await requestPermission())) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: `${REMINDER_PREFIX}test`,
    content: { ...baseContent(t('notifTitle'), reminderBody({ name: t('medsTestName'), dose: '', mealRelation: 'after' }, wardName, t), { kind: 'med', wardId: '', medicationId: '', time: '' }) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL_ID },
  });
  return true;
}

// ---------------------------------------------------------------- marking doses

/** Marks a dose (screen or notification button), cancels its "not marked" follow-up and warns about low stock. */
export async function markDoseWithReminders(wardId: string, medicationId: string, scheduledAt: Date, status: 'taken' | 'skipped', uid: string, t: T): Promise<MarkResult> {
  const result = await markDose(wardId, medicationId, scheduledAt, status, uid);
  if (SUPPORTED) {
    const key = doseKey(medicationId, scheduledAt);
    await Notifications.cancelScheduledNotificationAsync(followUpId(key)).catch(() => undefined);
    await Notifications.cancelScheduledNotificationAsync(snoozeId(key)).catch(() => undefined);
    if (result.stockDecreased && result.stock !== null && result.stock <= LOW_STOCK && state.permission === 'granted') {
      await Notifications.scheduleNotificationAsync({
        content: { title: t('notifLowStockTitle'), body: t('notifLowStockBody', { name: result.name, n: result.stock }), sound: 'default' },
        trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
      }).catch(() => undefined);
    }
  }
  return result;
}

async function alreadyHandled(id: string) {
  try {
    const list: string[] = JSON.parse((await AsyncStorage.getItem(HANDLED_KEY)) ?? '[]');
    if (list.includes(id)) return true;
    await AsyncStorage.setItem(HANDLED_KEY, JSON.stringify([...list, id].slice(-30)));
  } catch { /* ignore */ }
  return false;
}

export type ResponseOutcome = 'taken' | 'snoozed' | 'opened' | 'ignored';

/**
 * Handles a tap or an action button. Called by the response listener while the app runs, and with
 * getLastNotificationResponseAsync() on the next launch if the app was closed.
 */
export async function handleReminderResponse(response: Notifications.NotificationResponse, uid: string | undefined, t: T): Promise<ResponseOutcome> {
  const { notification, actionIdentifier } = response;
  const data = notification.request.content.data;
  if (!isReminder(data) || !data.medicationId) return 'ignored';
  if (await alreadyHandled(`${notification.request.identifier}|${actionIdentifier}|${notification.date}`)) return 'ignored';
  const scheduledAt = scheduledAtFor(data, new Date(notification.date));
  if (!scheduledAt) return 'ignored';

  if (actionIdentifier === ACTION_TAKEN && uid) {
    await markDoseWithReminders(data.wardId, data.medicationId, scheduledAt, 'taken', uid, t);
    await Notifications.dismissNotificationAsync(notification.request.identifier).catch(() => undefined);
    return 'taken';
  }
  if (actionIdentifier === ACTION_SNOOZE) {
    const key = doseKey(data.medicationId, scheduledAt);
    await Notifications.scheduleNotificationAsync({
      identifier: snoozeId(key),
      content: baseContent(notification.request.content.title ?? t('notifTitle'), notification.request.content.body ?? '', { ...data, scheduledAt: scheduledAt.getTime() }),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: Date.now() + SNOOZE_MS, channelId: CHANNEL_ID },
    });
    await Notifications.dismissNotificationAsync(notification.request.identifier).catch(() => undefined);
    return 'snoozed';
  }
  return 'opened';
}
