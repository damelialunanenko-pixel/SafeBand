import { httpsCallable } from 'firebase/functions';
import type { SecurityAnswers } from '@/config/security-questions';
import { functions } from './firebase';

/**
 * Client side of the security questions. Answers are hashed, stored and checked only by the
 * Cloud Functions in functions/src/security.ts; the app never reads securityAnswers/{uid}.
 *
 * This is an application-level check for new devices, not Firebase multi-factor authentication:
 * the Firebase session is already valid after the password, the app just refuses to continue.
 */
const setFn = httpsCallable<{ answers: SecurityAnswers }, { ok: true }>(functions, 'setSecurityAnswers');
const verifyFn = httpsCallable<{ answers: SecurityAnswers }, { ok: true }>(functions, 'verifySecurityAnswers');

const codeOf = (e: unknown) => (typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '');
const detailsOf = (e: unknown) => (typeof e === 'object' && e && 'details' in e ? ((e as { details: unknown }).details as Record<string, unknown> | undefined) : undefined);

export type SetResult = 'ok' | 'alreadySet' | 'error' | 'network';

export async function saveSecurityAnswers(answers: SecurityAnswers): Promise<SetResult> {
  try { await setFn({ answers }); return 'ok'; }
  catch (e) {
    const code = codeOf(e);
    if (code === 'functions/already-exists') return 'alreadySet';
    if (code === 'functions/unavailable' || code === 'functions/deadline-exceeded') return 'network';
    return 'error';
  }
}

export type VerifyResult =
  | { kind: 'ok' }
  | { kind: 'wrong'; attemptsLeft: number }
  | { kind: 'locked'; lockedUntil: number }
  | { kind: 'error'; network: boolean };

export async function checkSecurityAnswers(answers: SecurityAnswers): Promise<VerifyResult> {
  try { await verifyFn({ answers }); return { kind: 'ok' }; }
  catch (e) {
    const code = codeOf(e);
    const details = detailsOf(e);
    if (code === 'functions/permission-denied' && typeof details?.attemptsLeft === 'number') return { kind: 'wrong', attemptsLeft: details.attemptsLeft };
    if (code === 'functions/resource-exhausted' && typeof details?.lockedUntil === 'number') return { kind: 'locked', lockedUntil: details.lockedUntil };
    return { kind: 'error', network: code === 'functions/unavailable' || code === 'functions/deadline-exceeded' };
  }
}
