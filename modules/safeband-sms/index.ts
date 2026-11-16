import { requireOptionalNativeModule, type NativeModule } from 'expo';
import { Platform } from 'react-native';

export type IncomingSms = { sender: string; body: string; timestamp: number };

type SafebandSmsEvents = { onSmsReceived: (sms: IncomingSms) => void };

declare class SafebandSmsNativeModule extends NativeModule<SafebandSmsEvents> {
  isListening(): boolean;
  startListening(): boolean;
  stopListening(): void;
  readInbox(sinceMs: number, limit: number): Promise<IncomingSms[]>;
}

/**
 * Native SMS bridge. `null` on iOS / web and in Expo Go (the native code is only
 * present in a development or release build made with `npx expo run:android` / EAS).
 */
export const SafebandSms: SafebandSmsNativeModule | null =
  Platform.OS === 'android' ? requireOptionalNativeModule<SafebandSmsNativeModule>('SafebandSms') : null;

export const isSmsSupported = () => SafebandSms !== null;
