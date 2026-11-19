import * as admin from "firebase-admin";
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";

/**
 * Security questions — stored and checked only here.
 *
 * securityAnswers/{uid} = { hash, salt, params, failedAttempts, lockedUntil, ... }
 * Firestore rules deny all client access to that collection; only the Admin SDK reads it.
 *
 * The client sends answer option IDs (never visible text). They are joined in a fixed question
 * order and hashed with scrypt and a per-user random salt.
 */

const QUESTION_IDS = ["friendInitial", "fatherCity", "firstCar", "favoriteAnimal"] as const;
type Answers = Record<(typeof QUESTION_IDS)[number], string>;

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64, maxmem: 64 * 1024 * 1024 };

const scrypt = (password: string, salt: Buffer, keylen: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key))));

const hashAnswers = (answers: Answers, salt: Buffer) =>
  scrypt(QUESTION_IDS.map((q) => answers[q]).join("|"), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: SCRYPT.maxmem });

function parseAnswers(data: unknown): Answers {
  const raw = (data as { answers?: unknown } | null)?.answers;
  if (!raw || typeof raw !== "object") throw new HttpsError("invalid-argument", "answers required");
  const out = {} as Answers;
  for (const q of QUESTION_IDS) {
    const v = (raw as Record<string, unknown>)[q];
    if (typeof v !== "string" || !/^[a-z0-9_]{1,40}$/.test(v)) throw new HttpsError("invalid-argument", "invalid answers");
    out[q] = v;
  }
  return out;
}

function requireVerifiedUser(request: CallableRequest): string {
  if (!request.auth) throw new HttpsError("unauthenticated", "sign in required");
  if (request.auth.token.email_verified !== true) throw new HttpsError("permission-denied", "email not verified");
  return request.auth.uid;
}

const answersRef = (uid: string) => admin.firestore().collection("securityAnswers").doc(uid);
const markQuestionsSet = (uid: string) =>
  admin.firestore().collection("users").doc(uid).set({ securityQuestionsSet: true }, { merge: true });

/** Saves the answers once. Changing them later is intentionally not supported by this function. */
export const setSecurityAnswers = onCall(async (request) => {
  const uid = requireVerifiedUser(request);
  const answers = parseAnswers(request.data);
  const salt = randomBytes(16);
  const hash = await hashAnswers(answers, salt);
  const ref = answersRef(uid);

  const created = await admin.firestore().runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return false;
    tx.create(ref, {
      hash: hash.toString("base64"),
      salt: salt.toString("base64"),
      algorithm: "scrypt",
      params: { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, keylen: SCRYPT.keylen },
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  });

  // Also repairs a missing flag if the answers already existed.
  await markQuestionsSet(uid);
  if (!created) throw new HttpsError("already-exists", "answers already set");
  return { ok: true };
});

/**
 * Checks the answers. 5 failures in a row lock the check for 15 minutes; counter and lock are
 * kept server-side. The response never says which answer was wrong.
 */
export const verifySecurityAnswers = onCall(async (request) => {
  const uid = requireVerifiedUser(request);
  const answers = parseAnswers(request.data);
  const ref = answersRef(uid);

  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("failed-precondition", "answers not set");
  const stored = snap.data()!;
  const lockedUntil = (stored.lockedUntil as admin.firestore.Timestamp | null)?.toMillis() ?? 0;
  if (lockedUntil > Date.now()) throw new HttpsError("resource-exhausted", "locked", { lockedUntil });

  const expected = Buffer.from(stored.hash as string, "base64");
  const actual = await hashAnswers(answers, Buffer.from(stored.salt as string, "base64"));
  const match = expected.length === actual.length && timingSafeEqual(expected, actual);

  const result = await admin.firestore().runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data();
    if (!current) return { kind: "missing" as const };
    const lock = (current.lockedUntil as admin.firestore.Timestamp | null)?.toMillis() ?? 0;
    if (lock > Date.now()) return { kind: "locked" as const, lockedUntil: lock };
    if (match) {
      tx.update(ref, { failedAttempts: 0, lockedUntil: null, lastVerifiedAt: admin.firestore.FieldValue.serverTimestamp() });
      return { kind: "ok" as const };
    }
    const failed = ((current.failedAttempts as number) ?? 0) + 1;
    if (failed >= MAX_FAILED_ATTEMPTS) {
      const until = Date.now() + LOCK_MS;
      tx.update(ref, { failedAttempts: 0, lockedUntil: admin.firestore.Timestamp.fromMillis(until) });
      return { kind: "locked" as const, lockedUntil: until };
    }
    tx.update(ref, { failedAttempts: failed });
    return { kind: "wrong" as const, attemptsLeft: MAX_FAILED_ATTEMPTS - failed };
  });

  switch (result.kind) {
    case "ok": return { ok: true };
    case "missing": throw new HttpsError("failed-precondition", "answers not set");
    case "locked": throw new HttpsError("resource-exhausted", "locked", { lockedUntil: result.lockedUntil });
    case "wrong": throw new HttpsError("permission-denied", "answers do not match", { attemptsLeft: result.attemptsLeft });
  }
});
