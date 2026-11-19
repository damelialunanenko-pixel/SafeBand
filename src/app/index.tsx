import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/components/form';
import { useLocalization } from '@/localization';

export default function Welcome() {
  const router = useRouter();
  const { t } = useLocalization();
  return (
    <SafeAreaView style={s.page}>
      <View style={s.header}>
        <Text style={s.title} accessibilityRole="header">{t('careBand')}</Text>
        <Text style={s.subtitle}>{t('startSubtitle')}</Text>
      </View>
      <Pressable accessibilityRole="button" style={[s.card, s.primary]} onPress={() => router.push('/register' as Href)}>
        <Text style={s.question}>{t('firstTimeTitle')}</Text>
        <Text style={s.action}>{t('firstTimeAction')} →</Text>
      </Pressable>
      <Pressable accessibilityRole="button" style={[s.card, s.secondary]} onPress={() => router.push('/auth')}>
        <Text style={[s.question, s.dark]}>{t('returningTitle')}</Text>
        <Text style={[s.action, s.darkAction]}>{t('returningAction')} →</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', backgroundColor: colors.page, padding: 24, gap: 16 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 36, fontWeight: '800', color: colors.title },
  subtitle: { color: colors.muted, marginTop: 8, fontSize: 16, textAlign: 'center' },
  card: { borderRadius: 18, paddingVertical: 26, paddingHorizontal: 22, minHeight: 120, justifyContent: 'center' },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: '#ffffff', borderWidth: 2, borderColor: colors.primary },
  question: { color: '#e3f0fc', fontSize: 17, fontWeight: '600' },
  action: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 6 },
  dark: { color: colors.muted },
  darkAction: { color: colors.primary },
});
