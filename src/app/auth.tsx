import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth } from "../services/firebase";

export default function AuthScreen() {
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [loading, setLoading] = useState(false);
 const router = useRouter();

 const login = async () => {
   if (!email || !password) {
     Alert.alert("Ошибка", "Заполни email и пароль");
     return;
   }
   setLoading(true);
   try {
     await signInWithEmailAndPassword(auth, email, password);
     router.replace("/home");
   } catch (e: any) {
     Alert.alert("Ошибка входа", e.message);
   } finally {
     setLoading(false);
   }
 };

 const register = async () => {
   if (!email || !password) {
     Alert.alert("Ошибка", "Заполни email и пароль");
     return;
   }
   if (password.length < 6) {
     Alert.alert("Ошибка", "Пароль должен быть минимум 6 символов");
     return;
   }
   setLoading(true);
   try {
     await createUserWithEmailAndPassword(auth, email, password);
     router.replace("/home");
   } catch (e: any) {
     Alert.alert("Ошибка регистрации", e.message);
   } finally {
     setLoading(false);
   }
 };

 return (
   <View style={{
     flex: 1,
     justifyContent: "center",
     padding: 24,
     backgroundColor: "#1a3a6b"
   }}>

     {/* Заголовок */}
     <Text style={{
       fontSize: 32, color: "white",
       fontWeight: "bold", marginBottom: 8
     }}>
       Unlimited
     </Text>
     <Text style={{
       fontSize: 16, color: "#93c5fd",
       marginBottom: 40
     }}>
       Войдите или создайте аккаунт
     </Text>

     {/* Email */}
     <Text style={{ color: "#93c5fd", marginBottom: 6, fontSize: 14 }}>
       Email
     </Text>
     <TextInput
       placeholder="example@mail.com"
       placeholderTextColor="#475569"
       onChangeText={setEmail}
       autoCapitalize="none"
       keyboardType="email-address"
       value={email}
       style={{
         backgroundColor: "#1e3a5f",
         color: "white",
         padding: 14,
         marginBottom: 16,
         borderRadius: 10,
         fontSize: 16,
       }}
     />

     {/* Пароль */}
     <Text style={{ color: "#93c5fd", marginBottom: 6, fontSize: 14 }}>
       Пароль
     </Text>
     <TextInput
       placeholder="Минимум 6 символов"
       placeholderTextColor="#475569"
       secureTextEntry
       onChangeText={setPassword}
       value={password}
       style={{
         backgroundColor: "#1e3a5f",
         color: "white",
         padding: 14,
         marginBottom: 28,
         borderRadius: 10,
         fontSize: 16,
       }}
     />

     {/* Кнопка Войти */}
     <TouchableOpacity
       onPress={login}
       disabled={loading}
       style={{
         backgroundColor: loading ? "#334155" : "#3b82f6",
         padding: 16,
         borderRadius: 10,
         marginBottom: 12,
         alignItems: "center",
       }}
     >
       {loading ? (
         <ActivityIndicator color="white" />
       ) : (
         <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>
           Войти
         </Text>
       )}
     </TouchableOpacity>

     {/* Кнопка Регистрация */}
     <TouchableOpacity
       onPress={register}
       disabled={loading}
       style={{
         backgroundColor: loading ? "#334155" : "#22c55e",
         padding: 16,
         borderRadius: 10,
         alignItems: "center",
       }}
     >
       {loading ? (
         <ActivityIndicator color="white" />
       ) : (
         <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>
           Регистрация
         </Text>
       )}
     </TouchableOpacity>

   </View>
 );
}