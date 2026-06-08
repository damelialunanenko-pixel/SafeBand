import { getAuth } from "firebase/auth";
import {
    collection,
    DocumentData,
    onSnapshot,
    orderBy,
    query, where
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { db } from "../services/firebase";

export default function HistoryScreen() {
  const [wards, setWards] = useState<DocumentData[]>([]);
  const [selectedWard, setSelectedWard] = useState<DocumentData | null>(null);
  const [events, setEvents] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const user = auth.currentUser;

  // Загружаем подопечных
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "wards"),
      where("guardianId", "==", user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setWards(data);
      if (data.length > 0 && !selectedWard) setSelectedWard(data[0]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Загружаем события выбранного подопечного
  useEffect(() => {
    if (!selectedWard) return;
    const q = query(
      collection(db, "events"),
      where("wardId", "==", selectedWard.id),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [selectedWard]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "fall": return "⚠️";
      case "sos": return "🆘";
      case "zone_exit": return "📍";
      case "low_battery": return "🔋";
      case "no_movement": return "😶";
      case "danger_sound": return "🔊";
      case "connected": return "✅";
      case "disconnected": return "❌";
      default: return "📋";
    }
  };

  const getEventText = (type: string) => {
    switch (type) {
      case "fall": return "Зафиксировано падение";
      case "sos": return "Нажата кнопка SOS";
      case "zone_exit": return "Выход из безопасной зоны";
      case "low_battery": return "Низкий заряд батареи";
      case "no_movement": return "Долгое отсутствие движения";
      case "danger_sound": return "Обнаружен опасный звук";
      case "connected": return "Браслет подключён";
      case "disconnected": return "Браслет отключён";
      default: return type;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "fall":
      case "sos": return "#ef4444";
      case "zone_exit":
      case "no_movement":
      case "danger_sound": return "#f97316";
      case "low_battery": return "#eab308";
      case "connected": return "#22c55e";
      case "disconnected": return "#94a3b8";
      default: return "#93c5fd";
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1a3a6b" }}>
      <ActivityIndicator color="white" size="large" />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#1a3a6b" }}>

      {/* Заголовок */}
      <View style={{ padding: 20, paddingBottom: 8 }}>
        <Text style={{ color: "white", fontSize: 22, fontWeight: "bold" }}>
          История событий
        </Text>
      </View>

      {/* Выбор подопечного */}
      {wards.length > 1 && (
        <ScrollView horizontal style={{ maxHeight: 50, paddingHorizontal: 12, paddingVertical: 4 }}>
          {wards.map(w => (
            <TouchableOpacity
              key={w.id}
              onPress={() => setSelectedWard(w)}
              style={{
                backgroundColor: selectedWard?.id === w.id ? "#3b82f6" : "#1e3a5f",
                paddingHorizontal: 16, paddingVertical: 6,
                borderRadius: 20, marginRight: 8
              }}>
              <Text style={{ color: "white", fontSize: 13 }}>{w.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Список событий */}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {events.length === 0 ? (
          <View style={{
            backgroundColor: "#1e3a5f", borderRadius: 14,
            padding: 24, alignItems: "center", marginTop: 20
          }}>
            <Text style={{ color: "#93c5fd", fontSize: 16 }}>
              Событий пока нет
            </Text>
          </View>
        ) : (
          events.map(event => (
            <View key={event.id} style={{
              backgroundColor: "#1e3a5f",
              borderRadius: 14, padding: 16,
              marginBottom: 10,
              flexDirection: "row",
              alignItems: "center",
              borderLeftWidth: 4,
              borderLeftColor: getEventColor(event.type),
            }}>
              <Text style={{ fontSize: 28, marginRight: 14 }}>
                {getEventIcon(event.type)}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{
                  color: "white", fontSize: 15,
                  fontWeight: "bold", marginBottom: 2
                }}>
                  {getEventText(event.type)}
                </Text>
                {event.details ? (
                  <Text style={{ color: "#93c5fd", fontSize: 13 }}>
                    {event.details}
                  </Text>
                ) : null}
                <Text style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                  {formatTime(event.createdAt)}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

    </View>
  );
}