import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  collection,
  doc, DocumentData,
  onSnapshot,
  query, where
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import { db } from "../services/firebase";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
export default function HomeScreen() {
  const [wards, setWards] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "wards"),
      where("guardianId", "==", user.uid)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const wardsData = await Promise.all(snap.docs.map(async (wardDoc) => {
        const wardData = { id: wardDoc.id, ...wardDoc.data() };

        // Слушаем данные с ESP32 по braceletId
        return wardData;
      }));
      setWards(wardsData);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1a3a6b" }}>
        <ActivityIndicator color="white" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#1a3a6b" }}
      contentContainerStyle={{ padding: 20 }}>

      <Text style={{ color: "white", fontSize: 22, fontWeight: "bold", marginBottom: 4 }}>
        Добрый день,
      </Text>
      <Text style={{ color: "#93c5fd", fontSize: 14, marginBottom: 24 }}>
        {user?.email}
      </Text>

      {wards.length === 0 ? (
        <View style={{
          backgroundColor: "#1e3a5f", borderRadius: 14,
          padding: 20, alignItems: "center"
        }}>
          <Text style={{ color: "#93c5fd", fontSize: 16, marginBottom: 16 }}>
            У вас ещё нет подопечных
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/ward")}
            style={{
              backgroundColor: "#3b82f6", paddingVertical: 12,
              paddingHorizontal: 24, borderRadius: 10
            }}>
            <Text style={{ color: "white", fontSize: 16 }}>
              + Добавить подопечного
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        wards.map(ward => <WardCard key={ward.id} ward={ward} />)
      )}

    </ScrollView>
  );
}

function WardCard({ ward }: { ward: DocumentData }) {
  const [deviceData, setDeviceData] = useState<DocumentData | null>(null);
  const [mapVisible, setMapVisible] = useState(false);

  // Слушаем ESP32 данные в реальном времени
  useEffect(() => {
  if (!ward.braceletId) return;

  const unsub = onSnapshot(doc(db, "devices", ward.braceletId), (snap) => {
    if (!snap.exists()) return;
    const prev = deviceData;
    const next = snap.data();

    // Падение
    if (prev && !prev.fall_detected && next?.fall_detected) {
      Notifications.scheduleNotificationAsync({
        content: {
          title: "⚠️ Зафиксировано падение!",
          body: `${ward.name} упал. Проверьте местоположение.`,
        },
        trigger: null,
      });
    }

    // SOS
    if (prev && !prev.sos_pressed && next?.sos_pressed) {
      Notifications.scheduleNotificationAsync({
        content: {
          title: "🆘 Нажата кнопка SOS!",
          body: `${ward.name} нуждается в помощи!`,
        },
        trigger: null,
      });
    }

    // Батарея
    if (prev && prev.battery >= 20 && next?.battery < 20) {
      Notifications.scheduleNotificationAsync({
        content: {
          title: "🔋 Низкий заряд!",
          body: `Браслет ${ward.name} нужно зарядить.`,
        },
        trigger: null,
      });
    }

    // Вышел из зоны
    if (prev && prev.isSafe && !next?.isSafe) {
      Notifications.scheduleNotificationAsync({
        content: {
          title: "📍 Выход из зоны!",
          body: `${ward.name} вышел за пределы безопасной зоны.`,
        },
        trigger: null,
      });
    }

    setDeviceData(next ?? null);
  });

  return () => unsub();
}, [ward.braceletId]);

  const battery = deviceData?.battery ?? 0;
  const connected = deviceData?.connected ?? false;
  const location = deviceData?.location ?? null;
  const fallDetected = deviceData?.fall_detected ?? false;
  const sosPressed = deviceData?.sos_pressed ?? false;
  const noMovement = deviceData?.no_movement ?? false;
  const dangerSound = deviceData?.danger_sound ?? false;
  const lastUpdated = deviceData?.last_updated ?? null;
  const isSafe = ward.isSafe ?? true;
  const safeRadius = ward.safeRadius ?? 100;

  const isLowBattery = battery < 20;
  const hasAlert = fallDetected || sosPressed || noMovement || dangerSound;

  return (
    <View style={{ marginBottom: 24 }}>

      <Text style={{ color: "white", fontSize: 20, fontWeight: "bold", marginBottom: 12 }}>
        {ward.name}
      </Text>

      {/* АЛЕРТЫ */}
      {hasAlert && (
        <View style={{
          backgroundColor: "#7f1d1d", borderRadius: 14,
          padding: 14, marginBottom: 12
        }}>
          {fallDetected && (
            <Text style={{ color: "#fca5a5", fontWeight: "bold", fontSize: 14 }}>
              ⚠️ Зафиксировано падение!
            </Text>
          )}
          {sosPressed && (
            <Text style={{ color: "#fca5a5", fontWeight: "bold", fontSize: 14 }}>
              🆘 Нажата кнопка SOS!
            </Text>
          )}
          {noMovement && (
            <Text style={{ color: "#fca5a5", fontWeight: "bold", fontSize: 14 }}>
              😶 Долгое отсутствие движения!
            </Text>
          )}
          {dangerSound && (
            <Text style={{ color: "#fca5a5", fontWeight: "bold", fontSize: 14 }}>
              🔊 Обнаружен опасный звук!
            </Text>
          )}
        </View>
      )}

      {/* МЕСТОПОЛОЖЕНИЕ */}
      <View style={cardStyle}>
        <View style={{ flex: 1 }}>
          <Text style={labelStyle}>ТЕКУЩЕЕ МЕСТОПОЛОЖЕНИЕ</Text>
          {location ? (
            <Text style={valueStyle}>
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </Text>
          ) : (
            <Text style={valueStyle}>Нет данных</Text>
          )}
          <Text style={{
            color: isSafe ? "#4ade80" : "#f87171",
            fontSize: 13, marginTop: 2
          }}>
            {isSafe ? "В безопасном радиусе" : "⚠️ Вне безопасной зоны!"}
          </Text>
          <TouchableOpacity
            onPress={() => setMapVisible(true)}
            style={{
              backgroundColor: "#3b82f6", borderRadius: 8,
              paddingVertical: 6, paddingHorizontal: 12,
              marginTop: 8, alignSelf: "flex-start"
            }}>
            <Text style={{ color: "white", fontSize: 13 }}>
              Открыть карту →
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 36 }}>🗺️</Text>
      </View>

      {/* БАТАРЕЯ */}
      <View style={cardStyle}>
        <View style={{ flex: 1 }}>
          <Text style={labelStyle}>ЗАРЯД БАТАРЕИ: {battery}%</Text>
          {isLowBattery && (
            <View style={{
              backgroundColor: "#ef4444", borderRadius: 6,
              paddingVertical: 4, paddingHorizontal: 10,
              marginTop: 6, alignSelf: "flex-start"
            }}>
              <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>
                ТРЕБУЕТСЯ ЗАРЯДИТЬ УСТРОЙСТВО!!
              </Text>
            </View>
          )}
          {lastUpdated && (
            <Text style={{ color: "#64748b", fontSize: 11, marginTop: 6 }}>
              Обновлено: {new Date(lastUpdated).toLocaleTimeString()}
            </Text>
          )}
        </View>
        <Text style={{ fontSize: 36 }}>{isLowBattery ? "⚠️" : "🔋"}</Text>
      </View>

      {/* СТАТУС ПОДКЛЮЧЕНИЯ */}
      <View style={cardStyle}>
        <View style={{ flex: 1 }}>
          <Text style={labelStyle}>СТАТУС ПОДКЛЮЧЕНИЯ</Text>
          <Text style={valueStyle}>
            {connected ? "✅ Подключено" : "❌ Не подключено"}
          </Text>
        </View>
        <Text style={{ fontSize: 36 }}>{connected ? "🛡️" : "❌"}</Text>
      </View>

      {/* ДИАГНОЗ */}
      {ward.diagnosis ? (
        <View style={cardStyle}>
          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>ИНФОРМАЦИЯ</Text>
            <Text style={valueStyle}>Диагноз: {ward.diagnosis}</Text>
            <Text style={valueStyle}>ID браслета: {ward.braceletId}</Text>
          </View>
          <Text style={{ fontSize: 36 }}>👤</Text>
        </View>
      ) : null}

      {/* КАРТА — модальное окно */}
      <Modal visible={mapVisible} animationType="slide">
        <View style={{ flex: 1 }}>

          <View style={{
            backgroundColor: "#1a3a6b", padding: 16,
            flexDirection: "row", alignItems: "center",
            justifyContent: "space-between"
          }}>
            <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>
              📍 {ward.name}
            </Text>
            <TouchableOpacity onPress={() => setMapVisible(false)}>
              <Text style={{ color: "#93c5fd", fontSize: 16 }}>✕ Закрыть</Text>
            </TouchableOpacity>
          </View>

          {location ? (
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: location.lat,
                longitude: location.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              region={{
                latitude: location.lat,
                longitude: location.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              {/* Маркер подопечного */}
              <Marker
                coordinate={{ latitude: location.lat, longitude: location.lng }}
                title={ward.name}
                description={ward.diagnosis}
                pinColor={isSafe ? "blue" : "red"}
              />

              {/* Безопасная зона */}
              <Circle
                center={{ latitude: location.lat, longitude: location.lng }}
                radius={safeRadius}
                strokeColor={isSafe ? "#4ade80" : "#f87171"}
                fillColor={isSafe ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)"}
                strokeWidth={2}
              />
            </MapView>
          ) : (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1a3a6b" }}>
              <Text style={{ color: "white", fontSize: 16 }}>
                Нет данных о местоположении
              </Text>
            </View>
          )}

        </View>
      </Modal>

    </View>
  );
}

const cardStyle = {
  backgroundColor: "#1e3a5f",
  borderRadius: 14,
  padding: 16,
  marginBottom: 12,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  justifyContent: "space-between" as const,
};

const labelStyle = {
  color: "white",
  fontWeight: "bold" as const,
  fontSize: 13,
  marginBottom: 4,
};

const valueStyle = {
  color: "#93c5fd",
  fontSize: 13,
};