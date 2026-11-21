import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles } from '@/theme';
import { IconCircle, type IconName, type IconTone } from './icon';
import { AppText } from './text';

type ToastTone = 'success' | 'danger' | 'primary';
type Toast = { id: number; message: string; tone: ToastTone };
type ToastApi = { show: (message: string, tone?: ToastTone) => void };

const ToastContext = createContext<ToastApi>({ show: () => undefined });
const ICONS: Record<ToastTone, IconName> = { success: 'checkmark', danger: 'alert', primary: 'information' };
const TONES: Record<ToastTone, IconTone> = { success: 'success', danger: 'danger', primary: 'primary' };

/** Renders short, auto-hiding notifications at the top of the screen. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const s = useStyles();

  const show = useCallback((message: string, tone: ToastTone = 'primary') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, tone });
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <View pointerEvents="box-none" style={[s.host, { top: insets.top + 8 }]}>
        {toast ? (
          <Animated.View key={toast.id} entering={FadeInUp.duration(280)} exiting={FadeOutUp.duration(220)} style={s.toast} accessibilityLiveRegion="polite" accessibilityRole="alert">
            <IconCircle name={ICONS[toast.tone]} tone={TONES[toast.tone]} size={32} />
            <AppText variant="bodyMedium" style={s.text}>{toast.message}</AppText>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const useStyles = makeStyles((t) => ({
  host: { position: 'absolute', left: t.spacing.md, right: t.spacing.md, alignItems: 'center' },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, alignSelf: 'stretch',
    paddingVertical: t.spacing.sm, paddingHorizontal: t.spacing.md, borderRadius: t.radius.lg,
    backgroundColor: t.colors.cardRaised, ...t.shadows.lg,
  },
  text: { flex: 1 },
}));
