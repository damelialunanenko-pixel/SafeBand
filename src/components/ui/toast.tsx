import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles } from '@/theme';
import { IconCircle, type IconName, type IconTone } from './icon';
import { AppText } from './text';

type ToastTone = 'success' | 'danger' | 'primary';
type ToastAction = { label: string; onPress: () => void };
/** `action` adds a button to the toast; `duration` is in ms (default 2800). */
type ToastOptions = { action?: ToastAction; duration?: number };
type Toast = { id: number; message: string; tone: ToastTone; action?: ToastAction };
type ToastApi = { show: (message: string, tone?: ToastTone, options?: ToastOptions) => void };

const ToastContext = createContext<ToastApi>({ show: () => undefined });
const ICONS: Record<ToastTone, IconName> = { success: 'checkmark', danger: 'alert', primary: 'information' };
const TONES: Record<ToastTone, IconTone> = { success: 'success', danger: 'danger', primary: 'primary' };

/** Renders short, auto-hiding notifications at the top of the screen. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const s = useStyles();

  const show = useCallback((message: string, tone: ToastTone = 'primary', options: ToastOptions = {}) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, tone, action: options.action });
    timer.current = setTimeout(() => setToast(null), options.duration ?? 2800);
  }, []);
  const runAction = (action: ToastAction) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
    action.onPress();
  };
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
            {toast.action ? (
              <Pressable accessibilityRole="button" onPress={() => runAction(toast.action!)} hitSlop={8} style={({ pressed }) => [s.action, pressed && s.pressed]}>
                <AppText variant="bodyStrong" style={s.actionText}>{toast.action.label}</AppText>
              </Pressable>
            ) : null}
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
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: t.spacing.sm, borderRadius: t.radius.md },
  pressed: { opacity: 0.6 },
  actionText: { color: t.colors.primary },
}));
