import { getAuth } from "firebase/auth";
import {
    collection,
    doc,
    DocumentData,
    onSnapshot,
    query,
    updateDoc,
    where
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator, Alert,
    ScrollView,
    Text, TouchableOpacity,
    View
} from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import { db } from "../services/firebase";

export default function MapScreen() {
  const [wards, setWards] = useState<DocumentData[]>([]);
  const [selectedWard, setSelectedWard] = useState<DocumentData | null>(null);
  const [deviceData, setDeviceData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [newCenter, setNewCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [newRadius, setNewRadius] = useState(100);

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

  // Слушаем ESP32 данные выбранного подопечного
  useEffect(() => {
    if (!selectedWard?.braceletId) return;
    const unsub = onSnapshot(
      doc(db, "devices", selectedWard.braceletId),
      (snap) => {
        if (snap.exists()) setDeviceData(snap.data());
      }
    );
    return () => unsub();
  }, [selectedWard]);

  const location = deviceData?.location ?? null;
  const safeCenter = selectedWard?.safeCenter ?? location;
  const safeRadius = selectedWard?.safeRadius ?? 100;

  // Сохранить новый центр и радиус
  const saveZone = async () => {
    if (!selectedWard || !newCenter) {
      Alert.alert("Ошибка", "Нажмите на карту чтобы выбрать центр зоны");
      return;
    }
    try {
      await updateDoc(doc(db, "wards", selectedWard.id), {
        safeCenter: newCenter,
        safeRadius: newRadius,
      });
      setEditMode(false);
      setNewCenter(null);
      Alert.alert("Готово", "Безопасная зона сохранена!");
    } catch (e: any) {
      Alert.alert("Ошибка", e.message);
    }
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1a3a6b" }}>
      <ActivityIndicator color="white" size="large" />
    </View>
  );

  if (wards.length === 0) return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1a3a6b", padding: 20 }}>
      <Text style={{ color: "white", fontSize: 18, textAlign: "center" }}>
        Сначала добавьте подопечного
      </Text>
    </View>
  );

  const mapCenter = location ?? safeCenter ?? { lat: 51.18, lng: 71.44 };

  return (
    <View style={{ flex: 1, backgroundColor: "#1a3a6b" }}>

      {/* Выбор подопечного */}
      {wards.length > 1 && (
        <ScrollView horizontal style={{ maxHeight: 50, paddingHorizontal: 12, paddingVertical: 8 }}>
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

      {/* Карта */}
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: mapCenter.lat,
          longitude: mapCenter.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPress={(e) => {
          if (!editMode) return;
          const { latitude, longitude } = e.nativeEvent.coordinate;
          setNewCenter({ lat: latitude, lng: longitude });
        }}
      >
        {/* Маркер подопечного */}
        {location && (
          <Marker
            coordinate={{ latitude: location.lat, longitude: location.lng }}
            title={selectedWard?.name}
            description={selectedWard?.diagnosis}
            pinColor="blue"
          />
        )}

        {/* Новый центр зоны в режиме редактирования */}
        {editMode && newCenter && (
          <Marker
            coordinate={{ latitude: newCenter.lat, longitude: newCenter.lng }}
            title="Новый центр зоны"
            pinColor="yellow"
          />
        )}

        {/* Безопасная зона */}
        {safeCenter && (
          <Circle
            center={{
              latitude: editMode && newCenter ? newCenter.lat : safeCenter.lat,
              longitude: editMode && newCenter ? newCenter.lng : safeCenter.lng,
            }}
            radius={editMode ? newRadius : safeRadius}
            strokeColor="#4ade80"
            fillColor="rgba(74,222,128,0.15)"
            strokeWidth={2}
          />
        )}
      </MapView>

      {/* Панель управления */}
      <View style={{
        backgroundColor: "#1a3a6b",
        padding: 16,
      }}>
        {!editMode ? (
          <>
            <Text style={{ color: "white", fontSize: 16, fontWeight: "bold", marginBottom: 4 }}>
              {selectedWard?.name}
            </Text>
            <Text style={{ color: "#93c5fd", fontSize: 13, marginBottom: 12 }}>
              Безопасный радиус: {safeRadius} м
            </Text>
            <TouchableOpacity
              onPress={() => {
                setEditMode(true);
                setNewRadius(safeRadius);
                setNewCenter(safeCenter ?? null);
              }}
              style={{
                backgroundColor: "#3b82f6",
                padding: 14, borderRadius: 10,
                alignItems: "center"
              }}>
              <Text style={{ color: "white", fontWeight: "bold" }}>
                ✏️ Изменить безопасную зону
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={{ color: "#93c5fd", fontSize: 13, marginBottom: 8 }}>
              Нажмите на карту чтобы выбрать центр зоны
            </Text>

            {/* Радиус */}
            <Text style={{ color: "white", marginBottom: 6 }}>
              Радиус: {newRadius} м
            </Text>
            <View style={{ flexDirection: "row", marginBottom: 12, gap: 8 }}>
              {[50, 100, 200, 500].map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setNewRadius(r)}
                  style={{
                    backgroundColor: newRadius === r ? "#3b82f6" : "#1e3a5f",
                    paddingHorizontal: 14, paddingVertical: 8,
                    borderRadius: 8, flex: 1, alignItems: "center"
                  }}>
                  <Text style={{ color: "white", fontSize: 13 }}>{r}м</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => { setEditMode(false); setNewCenter(null); }}
                style={{
                  backgroundColor: "#475569", padding: 14,
                  borderRadius: 10, flex: 1, alignItems: "center"
                }}>
                <Text style={{ color: "white" }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveZone}
                style={{
                  backgroundColor: "#22c55e", padding: 14,
                  borderRadius: 10, flex: 1, alignItems: "center"
                }}>
                <Text style={{ color: "white", fontWeight: "bold" }}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

    </View>
  );
}