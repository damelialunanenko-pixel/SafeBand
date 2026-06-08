import * as admin from "firebase-admin";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

admin.initializeApp();

export const onDeviceUpdate = onDocumentUpdated(
  "devices/{braceletId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return null;

    const braceletId = event.params.braceletId;

    const wardsSnap = await admin.firestore()
      .collection("wards")
      .where("braceletId", "==", braceletId)
      .get();

    if (wardsSnap.empty) return null;

    const ward = wardsSnap.docs[0].data();
    const guardianSnap = await admin.firestore()
      .collection("users")
      .doc(ward.guardianId)
      .get();

    const fcmToken = guardianSnap.data()?.fcmToken;
    if (!fcmToken) return null;

    const messages: admin.messaging.Message[] = [];

    if (!before.fall_detected && after.fall_detected) {
      messages.push({
        token: fcmToken,
        notification: {
          title: "⚠️ Зафиксировано падение!",
          body: `${ward.name} упал. Проверьте местоположение.`,
        },
      });
    }

    if (!before.sos_pressed && after.sos_pressed) {
      messages.push({
        token: fcmToken,
        notification: {
          title: "🆘 Нажата кнопка SOS!",
          body: `${ward.name} нуждается в помощи!`,
        },
      });
    }

    if (before.isSafe && !after.isSafe) {
      messages.push({
        token: fcmToken,
        notification: {
          title: "📍 Выход из безопасной зоны!",
          body: `${ward.name} вышел за пределы зоны.`,
        },
      });
    }

    if (before.battery >= 20 && after.battery < 20) {
      messages.push({
        token: fcmToken,
        notification: {
          title: "🔋 Низкий заряд батареи",
          body: `Браслет ${ward.name} нужно зарядить. Осталось ${after.battery}%`,
        },
      });
    }

    for (const msg of messages) {
      await admin.messaging().send(msg);
    }

    return null;
  }
);