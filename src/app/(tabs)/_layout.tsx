import { Tabs } from 'expo-router/js-tabs';
import { useReducedMotion } from 'react-native-reanimated';
import { FloatingTabBar, type TabIcon } from '@/components/navigation/floating-tab-bar';
import { usePrimaryCareData } from '@/hooks/use-care-data';
import { useMedicationReminders } from '@/hooks/use-medication-reminders';
import { useLocalization } from '@/localization';
import { useAppTheme } from '@/theme';

const ICONS: Record<string, TabIcon> = {
  home: { active: 'home', inactive: 'home-outline' },
  map: { active: 'map', inactive: 'map-outline' },
  health: { active: 'heart', inactive: 'heart-outline' },
  medications: { active: 'medkit', inactive: 'medkit-outline' },
  settings: { active: 'settings', inactive: 'settings-outline' },
};

export const unstable_settings = { initialRouteName: 'home' };

/** Main app: Home, Map, Health, Medications, Settings under a floating glass tab bar. */
export default function TabsLayout() {
  const { t } = useLocalization();
  const { colors } = useAppTheme();
  const reduceMotion = useReducedMotion();
  // Medication reminders: rescheduled on start and on every change; notification buttons handled here.
  const { ward } = usePrimaryCareData();
  useMedicationReminders(ward);
  return (
    <Tabs
      backBehavior="history"
      tabBar={(props) => <FloatingTabBar {...props} icons={ICONS} />}
      screenOptions={{
        headerShown: false,
        animation: reduceMotion ? 'none' : 'fade',
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('tabHome') }} />
      <Tabs.Screen name="map" options={{ title: t('tabMap') }} />
      <Tabs.Screen name="health" options={{ title: t('tabHealth') }} />
      <Tabs.Screen name="medications" options={{ title: t('tabMeds') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabSettings') }} />
    </Tabs>
  );
}
