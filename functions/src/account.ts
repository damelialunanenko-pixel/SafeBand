import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";

/** The client must have re-entered the password shortly before calling (reauthenticateWithCredential). */
const MAX_AUTH_AGE_SECONDS = 5 * 60;
const WARD_COLLECTIONS = ["events", "healthReadings", "activeAlerts"] as const;

/**
 * Deletes the caller's data: users/{uid}, their wards (with the wards' events, health readings and
 * active alerts), the wardId link on bracelets, and securityAnswers/{uid}.
 * The Firebase Auth account itself is deleted by the client afterwards (deleteUser).
 */
export const deleteAccountData = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "sign in required");
  const uid = request.auth.uid;
  const authTime = Number(request.auth.token.auth_time ?? 0);
  if (Date.now() / 1000 - authTime > MAX_AUTH_AGE_SECONDS) throw new HttpsError("failed-precondition", "recent sign-in required");

  const db = admin.firestore();
  const writer = db.bulkWriter();
  const wards = await db.collection("wards").where("guardianId", "==", uid).get();

  for (const ward of wards.docs) {
    for (const name of WARD_COLLECTIONS) {
      const docs = await db.collection(name).where("wardId", "==", ward.id).get();
      docs.forEach((d) => void writer.delete(d.ref));
    }
    // Bracelets stay (they are hardware); only the link to the deleted ward is removed.
    const devices = await db.collection("devices").where("wardId", "==", ward.id).get();
    devices.forEach((d) => void writer.update(d.ref, { wardId: admin.firestore.FieldValue.delete() }));
    void writer.delete(ward.ref);
  }

  void writer.delete(db.collection("securityAnswers").doc(uid));
  void writer.delete(db.collection("users").doc(uid));
  await writer.close();
  return { ok: true, wards: wards.size };
});
