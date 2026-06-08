import { getAuth } from "firebase/auth";
import { addDoc, collection } from "firebase/firestore";
import { useState } from "react";
import {
    Alert, ScrollView,
    Text, TextInput,
    TouchableOpacity
} from "react-native";
import { db } from "../services/firebase";

export default function WardScreen() {
  const [name, setName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [braceletId, setBraceletId] = useState("");
  const [safeRadius, setSafeRadius] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name || !braceletId) {
      Alert.alert("Ошибка", "Заполни имя и ID браслета");
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const uid = auth.currentUser?.uid;

      await addDoc(collection(db, "wards"), {
        guardianId: uid,
        name,
        diagnosis,
        braceletId,
        safeRadius: Number(safeRadius) || 100,
        createdAt: new Date(),
      });

      Alert.alert("Готово", "Подопечный добавлен!");
      setName("");
      setDiagnosis("");
      setBraceletId("");
      setSafeRadius("");
    } catch (e: any) {
      Alert.alert("Ошибка", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0f172a" }}
      contentContainerStyle={{ padding: 20 }}>

      <Text style={{ color: "white", fontSize: 24, marginBottom: 24 }}>
        Добавить подопечного
      </Text>

      <Text style={{ color: "#94a3b8", marginBottom: 6 }}>Имя</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Например: Алия"
        placeholderTextColor="#475569"
        style={inputStyle}
      />

      <Text style={{ color: "#94a3b8", marginBottom: 6 }}>Диагноз</Text>
      <TextInput
        value={diagnosis}
        onChangeText={setDiagnosis}
        placeholder="Например: ДЦП"
        placeholderTextColor="#475569"
        style={inputStyle}
      />

      <Text style={{ color: "#94a3b8", marginBottom: 6 }}>ID браслета (ESP32)</Text>
      <TextInput
        value={braceletId}
        onChangeText={setBraceletId}
        placeholder="Например: ESP_A1B2C3"
        placeholderTextColor="#475569"
        style={inputStyle}
      />

      <Text style={{ color: "#94a3b8", marginBottom: 6 }}>
        Безопасный радиус (метры)
      </Text>
      <TextInput
        value={safeRadius}
        onChangeText={setSafeRadius}
        placeholder="100"
        placeholderTextColor="#475569"
        keyboardType="numeric"
        style={inputStyle}
      />

      <TouchableOpacity
        onPress={handleAdd}
        disabled={loading}
        style={{
          backgroundColor: loading ? "#334155" : "#3b82f6",
          padding: 16,
          borderRadius: 10,
          marginTop: 10,
          alignItems: "center",
        }}>
        <Text style={{ color: "white", fontSize: 16 }}>
          {loading ? "Сохранение..." : "+ Добавить подопечного"}
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const inputStyle = {
  backgroundColor: "#1e293b",
  color: "white",
  padding: 12,
  borderRadius: 8,
  marginBottom: 16,
  fontSize: 16,
} as const;
