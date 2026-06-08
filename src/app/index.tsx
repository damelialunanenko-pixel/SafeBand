import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function Home() {
  const router = useRouter();

  return (
    <View style={{
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#0f172a"
    }}>
      
      <Text style={{ color: "white", fontSize: 24, marginBottom: 20 }}>
        Добро пожаловать
      </Text>

      <TouchableOpacity
  onPress={() => {
    console.log("НАЖАЛИ КНОПКУ");
    router.push("/auth");
  }}
  style={{
    backgroundColor: "#3b82f6",
    padding: 15,
    borderRadius: 10
  }}
>
        <Text style={{ color: "white" }}>
          Вход / Регистрация
        </Text>
      </TouchableOpacity>

    </View>
  );
}